//! Retr0school Diploma — soulbound NEP-171 credentials for "The W3Schools of NEAR".
//!
//! * The owner registers tracks (e.g. `near`) with a public answer key and a pass score.
//! * A learner calls `mint_diploma(track, answers)`; the contract grades the quiz on-chain
//!   and, if the score passes, mints a diploma NFT to the caller.
//! * One diploma per account per track (token id = `"{track}:{account}"`).
//! * Diplomas are soulbound: `nft_transfer` / `nft_transfer_call` always panic.
//! * Anyone can verify a credential with the `verify_diploma` view method.
//!
//! Note: the answer key is public on-chain. This is a learning credential, not a proctored exam.

use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_contract_standards::non_fungible_token::events::NftMint;
use near_contract_standards::non_fungible_token::metadata::{
    NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata, NFT_METADATA_SPEC,
};
use near_contract_standards::non_fungible_token::{NonFungibleToken, Token, TokenId};
use near_sdk::collections::LazyOption;
use near_sdk::json_types::U128;
use near_sdk::store::IterableMap;
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, NearToken, PanicOnDefault, PromiseOrValue,
};

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum StorageKey {
    NonFungibleToken,
    Metadata,
    TokenMetadata,
    Enumeration,
    Tracks,
}

/// A course track that can issue diplomas.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Track {
    pub title: String,
    /// Index of the correct option for each question.
    pub answer_key: Vec<u8>,
    /// Minimum number of correct answers to pass.
    pub pass_score: u8,
}

/// Public view of a track (the answer key is omitted for brevity, it is still public state).
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
            tracks: IterableMap::new(StorageKey::Tracks),
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
    pub fn set_track(
        &mut self,
        track_id: String,
        title: String,
        answer_key: Vec<u8>,
        pass_score: u8,
    ) {
        self.assert_owner();
        require!(!track_id.is_empty() && track_id.len() <= 32, "Bad track id");
        require!(!track_id.contains(':'), "Track id cannot contain ':'");
        require!(
            !answer_key.is_empty() && answer_key.len() <= 50,
            "Bad answer key"
        );
        require!(
            pass_score > 0 && (pass_score as usize) <= answer_key.len(),
            "Bad pass score"
        );
        self.tracks.insert(
            track_id,
            Track {
                title,
                answer_key,
                pass_score,
            },
        );
    }

    pub fn set_base_uri(&mut self, base_uri: Option<String>) {
        self.assert_owner();
        let mut m = self.metadata.get().unwrap();
        m.base_uri = base_uri;
        self.metadata.set(&m);
    }

    // ---------- learner ----------

    /// Grade `answers` against the track's answer key and mint a soulbound diploma to the caller.
    /// Attach a small deposit (0.02 NEAR is plenty) to cover storage; the unused part is refunded.
    #[payable]
    pub fn mint_diploma(&mut self, track: String, answers: Vec<u8>) -> Token {
        let account_id = env::predecessor_account_id();
        let t = self
            .tracks
            .get(&track)
            .cloned()
            .unwrap_or_else(|| env::panic_str("Unknown track"));
        require!(
            answers.len() == t.answer_key.len(),
            format!("Expected {} answers", t.answer_key.len())
        );
        let score = answers
            .iter()
            .zip(t.answer_key.iter())
            .filter(|(a, k)| a == k)
            .count() as u8;
        let max_score = t.answer_key.len() as u8;
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
            media: Some(format!("diploma/{}.svg", track)),
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
                questions: t.answer_key.len() as u8,
                pass_score: t.pass_score,
            })
            .collect()
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
