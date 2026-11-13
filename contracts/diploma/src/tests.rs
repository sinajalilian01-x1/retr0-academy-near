use super::*;
use ed25519_dalek::{Signer, SigningKey};
use near_sdk::test_utils::{accounts, get_logs, VMContextBuilder};
use near_sdk::testing_env;

const DEPOSIT: NearToken = NearToken::from_millinear(20);
// 2026-11-13T12:00:00Z
const TS_NS: u64 = 1_794_571_200_000_000_000;
const TS_MS: u64 = TS_NS / 1_000_000;
const SEED: [u8; 32] = [7u8; 32];

fn grader() -> SigningKey {
    SigningKey::from_bytes(&SEED)
}

fn grader_pk() -> PublicKey {
    let raw = grader().verifying_key().to_bytes();
    format!("ed25519:{}", bs58::encode(raw).into_string())
        .parse()
        .unwrap()
}

/// What the off-chain grader returns: (score, max, expires, signature)
fn attest(account: &AccountId, track: &str, score: u8, max: u8) -> (u8, u8, u64, Base64VecU8) {
    let expires = TS_MS + 10 * 60 * 1000;
    let msg = attestation_message(&accounts(0), account, track, score, max, expires);
    let sig = grader().sign(msg.as_bytes()).to_bytes().to_vec();
    (score, max, expires, Base64VecU8(sig))
}

fn ctx(predecessor: AccountId, deposit: NearToken) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(accounts(0))
        .predecessor_account_id(predecessor)
        .attached_deposit(deposit)
        .block_timestamp(TS_NS);
    testing_env!(b.build());
}

fn setup() -> Contract {
    ctx(accounts(0), NearToken::from_yoctonear(0));
    let mut c = Contract::new(accounts(0), Some("https://example.com".into()));
    c.set_track("near".into(), "NEAR Fundamentals".into(), 8, 6);
    c.set_attestor(grader_pk());
    c
}

fn mint(c: &mut Contract, who: AccountId, track: &str, score: u8, max: u8) -> Token {
    let (s, m, e, sig) = attest(&who, track, score, max);
    ctx(who, DEPOSIT);
    c.mint_diploma(track.into(), s, m, e, sig)
}

#[test]
fn date_formatting() {
    assert_eq!(date_from_ms(0), "1970-01-01");
    assert_eq!(date_from_ms(TS_MS), "2026-11-13");
    assert_eq!(date_from_ms(951_782_400_000), "2000-02-29");
}

#[test]
fn mint_and_verify() {
    let mut c = setup();
    let t = mint(&mut c, accounts(1), "near", 6, 8);
    assert_eq!(t.token_id, "near:bob");
    assert_eq!(t.owner_id, accounts(1));
    let m = t.metadata.unwrap();
    assert_eq!(m.title.unwrap(), "Retr0 Academy Diploma: NEAR Fundamentals (Grade B)");
    assert_eq!(m.media.unwrap(), "https://example.com/api/diploma/near/bob");
    let extra: DiplomaExtra = near_sdk::serde_json::from_str(&m.extra.unwrap()).unwrap();
    assert_eq!(extra.score, 6);
    assert_eq!(extra.max_score, 8);
    assert_eq!(extra.track, "near");
    assert_eq!(extra.owner, accounts(1));
    assert_eq!(extra.date, "2026-11-13");
    assert_eq!(extra.grade.as_deref(), Some("B"));
    assert!(
        get_logs().iter().any(|l| l.contains("nft_mint")),
        "NEP-297 mint event"
    );

    let v = c.verify_diploma(accounts(1), "near".into()).unwrap();
    assert!(v.valid);
    assert_eq!(v.score, 6);
    assert_eq!(v.track_title, "NEAR Fundamentals");
    assert!(c.verify_diploma(accounts(2), "near".into()).is_none());
    assert!(c.verify_diploma(accounts(1), "other".into()).is_none());
    assert_eq!(c.nft_total_supply(), U128(1));
    assert_eq!(c.nft_tokens_for_owner(accounts(1), None, None).len(), 1);
    assert_eq!(c.nft_metadata().symbol, "R0DIPLOMA");
}

#[test]
#[should_panic(expected = "below the pass mark")]
fn failing_score_rejected() {
    let mut c = setup();
    mint(&mut c, accounts(1), "near", 5, 8);
}

#[test]
#[should_panic(expected = "Invalid grader signature")]
fn forged_score_rejected() {
    let mut c = setup();
    // grader signed 5/8, learner claims 8/8
    let (_, m, e, sig) = attest(&accounts(1), "near", 5, 8);
    ctx(accounts(1), DEPOSIT);
    c.mint_diploma("near".into(), 8, m, e, sig);
}

#[test]
#[should_panic(expected = "Invalid grader signature")]
fn attestation_is_bound_to_the_account() {
    let mut c = setup();
    // bob's attestation used by charlie
    let (s, m, e, sig) = attest(&accounts(1), "near", 8, 8);
    ctx(accounts(2), DEPOSIT);
    c.mint_diploma("near".into(), s, m, e, sig);
}

#[test]
#[should_panic(expected = "Invalid grader signature")]
fn wrong_signer_rejected() {
    let mut c = setup();
    let other = SigningKey::from_bytes(&[9u8; 32]);
    let expires = TS_MS + 60_000;
    let msg = attestation_message(&accounts(0), &accounts(1), "near", 8, 8, expires);
    let sig = Base64VecU8(other.sign(msg.as_bytes()).to_bytes().to_vec());
    ctx(accounts(1), DEPOSIT);
    c.mint_diploma("near".into(), 8, 8, expires, sig);
}

#[test]
#[should_panic(expected = "Attestation expired")]
fn expired_attestation_rejected() {
    let mut c = setup();
    let (s, m, e, sig) = attest(&accounts(1), "near", 8, 8);
    let mut b = VMContextBuilder::new();
    b.current_account_id(accounts(0))
        .predecessor_account_id(accounts(1))
        .attached_deposit(DEPOSIT)
        .block_timestamp((e + 1) * 1_000_000);
    testing_env!(b.build());
    c.mint_diploma("near".into(), s, m, e, sig);
}

#[test]
#[should_panic(expected = "does not match the track")]
fn max_score_must_match_track() {
    let mut c = setup();
    mint(&mut c, accounts(1), "near", 2, 2);
}

#[test]
#[should_panic(expected = "already holds a diploma")]
fn one_diploma_per_account_per_track() {
    let mut c = setup();
    mint(&mut c, accounts(1), "near", 8, 8);
    mint(&mut c, accounts(1), "near", 8, 8);
}

#[test]
fn same_account_different_tracks() {
    let mut c = setup();
    c.set_track("rust".into(), "Rust".into(), 2, 1);
    mint(&mut c, accounts(1), "near", 8, 8);
    mint(&mut c, accounts(1), "rust", 1, 2);
    assert_eq!(c.nft_supply_for_owner(accounts(1)), U128(2));
}

#[test]
#[should_panic(expected = "Unknown track")]
fn unknown_track() {
    let mut c = setup();
    mint(&mut c, accounts(1), "nope", 1, 1);
}

#[test]
#[should_panic(expected = "Attach a small deposit")]
fn requires_deposit() {
    let mut c = setup();
    let (s, m, e, sig) = attest(&accounts(1), "near", 8, 8);
    ctx(accounts(1), NearToken::from_yoctonear(0));
    c.mint_diploma("near".into(), s, m, e, sig);
}

#[test]
#[should_panic(expected = "soulbound")]
fn soulbound_transfer() {
    let mut c = setup();
    mint(&mut c, accounts(1), "near", 8, 8);
    ctx(accounts(1), NearToken::from_yoctonear(1));
    c.nft_transfer(accounts(2), "near:bob".into(), None, None);
}

#[test]
#[should_panic(expected = "Only the contract owner")]
fn only_owner_sets_tracks() {
    let mut c = setup();
    ctx(accounts(1), NearToken::from_yoctonear(0));
    c.set_track("x".into(), "X".into(), 1, 1);
}

#[test]
#[should_panic(expected = "Only the contract owner")]
fn only_owner_sets_attestor() {
    let mut c = setup();
    ctx(accounts(1), NearToken::from_yoctonear(0));
    c.set_attestor(grader_pk());
}

#[test]
fn tracks_and_attestor_views() {
    let c = setup();
    let t = c.get_tracks();
    assert_eq!(t.len(), 1);
    assert_eq!(t[0].id, "near");
    assert_eq!(t[0].questions, 8);
    assert_eq!(t[0].pass_score, 6);
    assert_eq!(c.get_attestor().unwrap(), String::from(&grader_pk()));
}

#[test]
fn attestation_message_format() {
    let m = attestation_message(
        &"d.testnet".parse().unwrap(),
        &"a.testnet".parse().unwrap(),
        "near",
        7,
        8,
        123,
    );
    assert_eq!(m, "retr0school-diploma|v1|d.testnet|a.testnet|near|7|8|123");
}

#[test]
fn migrate_from_v1_keeps_tokens_and_drops_answer_keys() {
    ctx(accounts(0), NearToken::from_yoctonear(0));
    // Build v1 state: one track with an on-chain answer key and one minted token.
    let meta = NFTContractMetadata {
        spec: NFT_METADATA_SPEC.to_string(),
        name: "Retr0school Diploma".into(),
        symbol: "R0DIPLOMA".into(),
        icon: None,
        base_uri: None,
        reference: None,
        reference_hash: None,
    };
    let mut v1 = ContractV1 {
        owner_id: accounts(0),
        tokens: NonFungibleToken::new(
            StorageKey::NonFungibleToken,
            accounts(0),
            Some(StorageKey::TokenMetadata),
            Some(StorageKey::Enumeration),
            None::<StorageKey>,
        ),
        metadata: LazyOption::new(StorageKey::Metadata, Some(&meta)),
        tracks: IterableMap::new(StorageKey::Tracks),
    };
    v1.tracks.insert(
        "near".into(),
        TrackV1 {
            title: "NEAR Fundamentals".into(),
            answer_key: vec![1, 1, 2, 0, 3, 1, 1, 0],
            pass_score: 6,
        },
    );
    v1.tracks.flush();
    v1.tokens.internal_mint_with_refund("near:bob".into(), accounts(1), Some(TokenMetadata {
        title: Some("old".into()), description: None, media: None, media_hash: None, copies: Some(1),
        issued_at: None, expires_at: None, starts_at: None, updated_at: None,
        extra: Some(r#"{"track":"near","score":7,"max_score":8,"owner":"bob","issued_at_ms":1,"date":"1970-01-01"}"#.into()),
        reference: None, reference_hash: None,
    }), None);
    env::state_write(&v1);

    let c = Contract::migrate(grader_pk());
    let t = c.get_tracks();
    assert_eq!(t[0].questions, 8);
    assert_eq!(t[0].pass_score, 6);
    assert_eq!(c.nft_total_supply(), U128(1));
    let v = c.verify_diploma(accounts(1), "near".into()).unwrap();
    assert_eq!(v.score, 7);
    assert!(c.get_attestor().is_some());
}

#[test]
fn grades() {
    assert_eq!(grade_for(40, 40), "A+");
    assert_eq!(grade_for(38, 40), "A+");
    assert_eq!(grade_for(36, 40), "A");
    assert_eq!(grade_for(32, 40), "B");
}

#[test]
fn old_extra_without_grade_still_parses() {
    let e: DiplomaExtra = near_sdk::serde_json::from_str(
        r#"{"track":"near","score":7,"max_score":8,"owner":"bob","issued_at_ms":1,"date":"2026-11-12"}"#,
    )
    .unwrap();
    assert!(e.grade.is_none());
}

#[test]
fn rebrand_rewrites_collection_and_tokens() {
    let mut c = setup();
    mint(&mut c, accounts(1), "near", 6, 8);
    ctx(accounts(0), NearToken::from_yoctonear(0));
    let n = c.rebrand("New Name".into(), "Retr0 Academy".into(), "Brand X".into());
    assert_eq!(n, 1);
    assert_eq!(c.nft_metadata().name, "New Name");
    let t = c.nft_token("near:bob".into()).unwrap();
    assert!(t.metadata.unwrap().title.unwrap().starts_with("Brand X Diploma"));
    assert_eq!(c.verify_diploma(accounts(1), "near".into()).unwrap().score, 6);
}

#[test]
#[should_panic(expected = "Only the contract owner")]
fn only_owner_rebrands() {
    let mut c = setup();
    ctx(accounts(1), NearToken::from_yoctonear(0));
    c.rebrand("x".into(), "a".into(), "b".into());
}
