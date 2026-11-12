//! Retr0school Diploma — soulbound NEP-171 credentials for "The W3Schools of NEAR".
//!
//! * The owner registers tracks (e.g. `near`) with a question count and a pass score.
//!   The answer key is NOT stored on chain.
//! * Quizzes are graded off chain by the Retr0school grading function, which signs an ed25519
//!   attestation `(contract, account, track, score, max_score, expires_at_ms)`.
//! * A learner calls `mint_diploma(track, score, max_score, expires_at_ms, signature)`. The contract
//!   checks the signature against the attestor public key stored on chain, the expiry, the caller,
//!   and the pass mark, then mints a diploma NFT to the caller.
//! * One diploma per account per track (token id = `"{track}:{account}"`).
//! * Diplomas are soulbound: `nft_transfer` / `nft_transfer_call` always panic.
//! * Anyone can verify a credential with the `verify_diploma` view method.

use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_contract_standards::non_fungible_token::events::NftMint;
use near_contract_standards::non_fungible_token::metadata::{
    NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata, NFT_METADATA_SPEC,
};
use near_contract_standards::non_fungible_token::{NonFungibleToken, Token, TokenId};
use near_sdk::collections::LazyOption;
use near_sdk::json_types::{Base64VecU8, U128};
use near_sdk::store::IterableMap;
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, CurveType, NearToken, PanicOnDefault,
    PromiseOrValue, PublicKey,
};

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum StorageKey {
    NonFungibleToken,
    Metadata,
    TokenMetadata,
    Enumeration,
    Tracks,
    TracksV2,
}

/// A course track that can issue diplomas. No answer key: grading happens off chain.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Track {
    pub title: String,
    /// Number of quiz questions (the attested max score must match).
    pub questions: u8,
    /// Minimum number of correct answers to pass.
    pub pass_score: u8,
}

/// v1 track layout (answer key on chain). Only used by `migrate`.
#[near(serializers = [borsh])]
pub struct TrackV1 {
    pub title: String,
    pub answer_key: Vec<u8>,
    pub pass_score: u8,
}

/// v1 contract layout. Only used by `migrate`.
#[near(serializers = [borsh])]
pub struct ContractV1 {
    owner_id: AccountId,
    tokens: NonFungibleToken,
    metadata: LazyOption<NFTContractMetadata>,
    tracks: IterableMap<String, TrackV1>,
}

/// Public view of a track.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct TrackView {
    pub id: String,
    pub title: String,
    pub questions: u8,
    pub pass_score: u8,
}

/// Structured diploma data, also stored as JSON in `TokenMetadata.extra`.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct DiplomaExtra {
    pub track: String,
    pub score: u8,
    pub max_score: u8,
    pub owner: AccountId,
    /// Block timestamp in milliseconds.
    pub issued_at_ms: u64,
    /// UTC date, YYYY-MM-DD.
    pub date: String,
}

/// Result of `verify_diploma`.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Verification {
    pub valid: bool,
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub track: String,
    pub track_title: String,
    pub score: u8,
    pub max_score: u8,
    pub issued_at_ms: u64,
    pub date: String,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    owner_id: AccountId,
    tokens: NonFungibleToken,
    metadata: LazyOption<NFTContractMetadata>,
    tracks: IterableMap<String, Track>,
    /// ed25519 public key of the off-chain grader.
    attestor_pk: Option<[u8; 32]>,
}

pub fn token_id_for(track: &str, account_id: &AccountId) -> TokenId {
    format!("{}:{}", track, account_id)
}

/// Convert days since 1970-01-01 to (year, month, day). Howard Hinnant's algorithm.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// The exact bytes the grader signs.
pub fn attestation_message(
    contract_id: &AccountId,
    account_id: &AccountId,
    track: &str,
    score: u8,
    max_score: u8,
    expires_at_ms: u64,
) -> String {
    format!(
        "retr0school-diploma|v1|{}|{}|{}|{}|{}|{}",
        contract_id, account_id, track, score, max_score, expires_at_ms
    )
}

fn parse_ed25519(public_key: &PublicKey) -> [u8; 32] {
    require!(
        public_key.curve_type() == CurveType::ED25519,
        "Attestor key must be ed25519"
    );
    public_key.as_bytes()[1..33]
        .try_into()
        .unwrap_or_else(|_| env::panic_str("Bad ed25519 key"))
}

pub fn date_from_ms(ms: u64) -> String {
    let (y, m, d) = civil_from_days((ms / 86_400_000) as i64);
    format!("{:04}-{:02}-{:02}", y, m, d)
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId, base_uri: Option<String>) -> Self {
        let metadata = NFTContractMetadata {
            spec: NFT_METADATA_SPEC.to_string(),
            name: "Retr0school Diploma".to_string(),
            symbol: "R0DIPLOMA".to_string(),
            icon: None,
            base_uri,
            reference: None,
            reference_hash: None,
        };
        Self {
            owner_id: owner_id.clone(),
            tokens: NonFungibleToken::new(
                StorageKey::NonFungibleToken,
                owner_id,
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
                None::<StorageKey>,
            ),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
            tracks: IterableMap::new(StorageKey::TracksV2),
            attestor_pk: None,
        }
    }

    /// v1 -> v2: drop the on-chain answer keys, keep every minted diploma.
    #[private]
    #[init(ignore_state)]
    pub fn migrate(attestor_public_key: PublicKey) -> Self {
        let mut old: ContractV1 =
            env::state_read().unwrap_or_else(|| env::panic_str("No v1 state"));
        let mut tracks = IterableMap::new(StorageKey::TracksV2);
        for (id, t) in old.tracks.iter() {
            tracks.insert(
                id.clone(),
                Track {
                    title: t.title.clone(),
                    questions: t.answer_key.len() as u8,
                    pass_score: t.pass_score,
                },
            );
        }
        old.tracks.clear();
        old.tracks.flush();
        Self {
            owner_id: old.owner_id,
            tokens: old.tokens,
            metadata: old.metadata,
            tracks,
            attestor_pk: Some(parse_ed25519(&attestor_public_key)),
        }
    }

    fn assert_owner(&self) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Only the contract owner can do this"
        );
    }

    // ---------- admin ----------

    /// Create or update a track.
    pub fn set_track(&mut self, track_id: String, title: String, questions: u8, pass_score: u8) {
        self.assert_owner();
        require!(!track_id.is_empty() && track_id.len() <= 32, "Bad track id");
        require!(
            !track_id.contains(':') && !track_id.contains('|') && !track_id.contains('/'),
            "Track id cannot contain ':', '|' or '/'"
        );
        require!(questions > 0 && questions <= 50, "Bad question count");
        require!(pass_score > 0 && pass_score <= questions, "Bad pass score");
        self.tracks.insert(
            track_id,
            Track {
                title,
                questions,
                pass_score,
            },
        );
    }

    /// Set the ed25519 public key of the off-chain grader, e.g. "ed25519:...".
    pub fn set_attestor(&mut self, public_key: PublicKey) {
        self.assert_owner();
        self.attestor_pk = Some(parse_ed25519(&public_key));
    }

    pub fn set_base_uri(&mut self, base_uri: Option<String>) {
        self.assert_owner();
        let mut m = self.metadata.get().unwrap();
        m.base_uri = base_uri;
        self.metadata.set(&m);
    }

    // ---------- learner ----------

    /// Mint a soulbound diploma to the caller, given a grader attestation for the caller's quiz.
    /// Attach a small deposit (0.02 NEAR is plenty) to cover storage; the unused part is refunded.
    #[payable]
    pub fn mint_diploma(
        &mut self,
        track: String,
        score: u8,
        max_score: u8,
        expires_at_ms: u64,
        signature: Base64VecU8,
    ) -> Token {
        let account_id = env::predecessor_account_id();
        let t = self
            .tracks
            .get(&track)
            .cloned()
            .unwrap_or_else(|| env::panic_str("Unknown track"));
        require!(
            max_score == t.questions,
            "Attested max score does not match the track"
        );
        require!(score <= max_score, "Bad score");
        require!(
            env::block_timestamp_ms() <= expires_at_ms,
            "Attestation expired, grade the quiz again"
        );
        let pk = self
            .attestor_pk
            .unwrap_or_else(|| env::panic_str("No attestor configured"));
        let sig: [u8; 64] = signature
            .0
            .as_slice()
            .try_into()
            .unwrap_or_else(|_| env::panic_str("Signature must be 64 bytes"));
        let message = attestation_message(
            &env::current_account_id(),
            &account_id,
            &track,
            score,
            max_score,
            expires_at_ms,
        );
        require!(
            env::ed25519_verify(&sig, message.as_bytes(), &pk),
            "Invalid grader signature"
        );
        require!(
            score >= t.pass_score,
            format!(
                "Score {}/{} is below the pass mark of {}",
                score, max_score, t.pass_score
            )
        );
        let token_id = token_id_for(&track, &account_id);
        require!(
            !self.tokens.owner_by_id.contains_key(&token_id),
            "This account already holds a diploma for this track"
        );

        let issued_at_ms = env::block_timestamp_ms();
        let extra = DiplomaExtra {
            track: track.clone(),
            score,
            max_score,
            owner: account_id.clone(),
            issued_at_ms,
            date: date_from_ms(issued_at_ms),
        };
        let metadata = TokenMetadata {
            title: Some(format!("Retr0school Diploma: {}", t.title)),
            description: Some(format!(
                "{} passed the Retr0school \"{}\" track with {}/{} on {} (UTC). Soulbound credential.",
                account_id, t.title, score, max_score, extra.date
            )),
            media: Some(self.media_for(&track, &account_id)),
            media_hash: None,
            copies: Some(1),
            issued_at: Some(issued_at_ms.to_string()),
            expires_at: None,
            starts_at: None,
            updated_at: None,
            extra: Some(near_sdk::serde_json::to_string(&extra).unwrap()),
            reference: None,
            reference_hash: None,
        };
        require!(
            env::attached_deposit() > NearToken::from_yoctonear(0),
            "Attach a small deposit (e.g. 0.02 NEAR) to pay for storage"
        );
        let token = self.tokens.internal_mint_with_refund(
            token_id,
            account_id.clone(),
            Some(metadata),
            Some(account_id),
        );
        NftMint {
            owner_id: &token.owner_id,
            token_ids: &[&token.token_id],
            memo: Some("Retr0school diploma"),
        }
        .emit();
        token
    }

    fn media_for(&self, track: &str, account_id: &AccountId) -> String {
        let path = format!("api/diploma/{}/{}", track, account_id);
        match self.metadata.get().and_then(|m| m.base_uri) {
            Some(base) => format!("{}/{}", base.trim_end_matches('/'), path),
            None => path,
        }
    }

    // ---------- views ----------

    /// Verify a credential. Returns `None` if the account has no diploma for the track.
    pub fn verify_diploma(&self, account_id: AccountId, track: String) -> Option<Verification> {
        let token_id = token_id_for(&track, &account_id);
        let token = self.tokens.nft_token(token_id.clone())?;
        let meta = token.metadata?;
        let extra: DiplomaExtra = near_sdk::serde_json::from_str(meta.extra.as_deref()?).ok()?;
        let track_title = self
            .tracks
            .get(&track)
            .map(|t| t.title.clone())
            .unwrap_or_default();
        Some(Verification {
            valid: token.owner_id == account_id,
            token_id,
            owner_id: token.owner_id,
            track,
            track_title,
            score: extra.score,
            max_score: extra.max_score,
            issued_at_ms: extra.issued_at_ms,
            date: extra.date,
        })
    }

    pub fn get_tracks(&self) -> Vec<TrackView> {
        self.tracks
            .iter()
            .map(|(id, t)| TrackView {
                id: id.clone(),
                title: t.title.clone(),
                questions: t.questions,
                pass_score: t.pass_score,
            })
            .collect()
    }

    /// The grader public key as "ed25519:<base58>".
    pub fn get_attestor(&self) -> Option<String> {
        self.attestor_pk.map(|pk| {
            let key = PublicKey::from_parts(CurveType::ED25519, pk.to_vec())
                .unwrap_or_else(|_| env::panic_str("Bad stored key"));
            String::from(&key)
        })
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner_id.clone()
    }
}

// ---------- NEP-171 core (soulbound) ----------
#[near]
impl NonFungibleTokenCore for Contract {
    #[payable]
    fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        let _ = (receiver_id, token_id, approval_id, memo);
        env::panic_str("Diplomas are soulbound and cannot be transferred");
    }

    #[payable]
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        let _ = (receiver_id, token_id, approval_id, memo, msg);
        env::panic_str("Diplomas are soulbound and cannot be transferred");
    }

    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.tokens.nft_token(token_id)
    }
}

// ---------- NEP-181 enumeration ----------
#[near]
impl NonFungibleTokenEnumeration for Contract {
    fn nft_total_supply(&self) -> U128 {
        self.tokens.nft_total_supply()
    }
    fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens(from_index, limit)
    }
    fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens.nft_supply_for_owner(account_id)
    }
    fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: Option<U128>,
        limit: Option<u64>,
    ) -> Vec<Token> {
        self.tokens
            .nft_tokens_for_owner(account_id, from_index, limit)
    }
}

// ---------- NEP-177 metadata ----------
#[near]
impl NonFungibleTokenMetadataProvider for Contract {
    fn nft_metadata(&self) -> NFTContractMetadata {
        self.metadata.get().unwrap()
    }
}

#[cfg(test)]
mod tests;
