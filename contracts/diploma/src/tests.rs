use super::*;
use near_sdk::test_utils::{accounts, get_logs, VMContextBuilder};
use near_sdk::testing_env;

const DEPOSIT: NearToken = NearToken::from_millinear(20);
// 2026-11-13T12:00:00Z
const TS_NS: u64 = 1_794_571_200_000_000_000;

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
    c.set_track(
        "near".into(),
        "NEAR Fundamentals".into(),
        vec![1, 0, 2, 3, 1, 0, 2, 1],
        6,
    );
    c
}

#[test]
fn date_formatting() {
    assert_eq!(date_from_ms(0), "1970-01-01");
    assert_eq!(date_from_ms(TS_NS / 1_000_000), "2026-11-13");
    assert_eq!(date_from_ms(951_782_400_000), "2000-02-29");
}

#[test]
fn mint_and_verify() {
    let mut c = setup();
    ctx(accounts(1), DEPOSIT);
    let t = c.mint_diploma("near".into(), vec![1, 0, 2, 3, 1, 0, 0, 0]); // 6/8
    assert_eq!(t.token_id, "near:bob");
    assert_eq!(t.owner_id, accounts(1));
    let m = t.metadata.unwrap();
    assert_eq!(m.title.unwrap(), "Retr0school Diploma: NEAR Fundamentals");
    let extra: DiplomaExtra = near_sdk::serde_json::from_str(&m.extra.unwrap()).unwrap();
    assert_eq!(extra.score, 6);
    assert_eq!(extra.max_score, 8);
    assert_eq!(extra.track, "near");
    assert_eq!(extra.owner, accounts(1));
    assert_eq!(extra.date, "2026-11-13");
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
    ctx(accounts(1), DEPOSIT);
    c.mint_diploma("near".into(), vec![0; 8]);
}

#[test]
#[should_panic(expected = "already holds a diploma")]
fn one_diploma_per_account_per_track() {
    let mut c = setup();
    ctx(accounts(1), DEPOSIT);
    c.mint_diploma("near".into(), vec![1, 0, 2, 3, 1, 0, 2, 1]);
    c.mint_diploma("near".into(), vec![1, 0, 2, 3, 1, 0, 2, 1]);
}

#[test]
fn same_account_different_tracks() {
    let mut c = setup();
    c.set_track("rust".into(), "Rust".into(), vec![0, 0], 1);
    ctx(accounts(1), DEPOSIT);
    c.mint_diploma("near".into(), vec![1, 0, 2, 3, 1, 0, 2, 1]);
    c.mint_diploma("rust".into(), vec![0, 1]);
    assert_eq!(c.nft_supply_for_owner(accounts(1)), U128(2));
}

#[test]
#[should_panic(expected = "Unknown track")]
fn unknown_track() {
    let mut c = setup();
    ctx(accounts(1), DEPOSIT);
    c.mint_diploma("nope".into(), vec![0]);
}

#[test]
#[should_panic(expected = "Expected 8 answers")]
fn wrong_answer_count() {
    let mut c = setup();
    ctx(accounts(1), DEPOSIT);
    c.mint_diploma("near".into(), vec![1, 0]);
}

#[test]
#[should_panic(expected = "Attach a small deposit")]
fn requires_deposit() {
    let mut c = setup();
    ctx(accounts(1), NearToken::from_yoctonear(0));
    c.mint_diploma("near".into(), vec![1, 0, 2, 3, 1, 0, 2, 1]);
}

#[test]
#[should_panic(expected = "soulbound")]
fn soulbound_transfer() {
    let mut c = setup();
    ctx(accounts(1), DEPOSIT);
    c.mint_diploma("near".into(), vec![1, 0, 2, 3, 1, 0, 2, 1]);
    ctx(accounts(1), NearToken::from_yoctonear(1));
    c.nft_transfer(accounts(2), "near:bob".into(), None, None);
}

#[test]
#[should_panic(expected = "Only the contract owner")]
fn only_owner_sets_tracks() {
    let mut c = setup();
    ctx(accounts(1), NearToken::from_yoctonear(0));
    c.set_track("x".into(), "X".into(), vec![0], 1);
}

#[test]
fn tracks_view() {
    let c = setup();
    let t = c.get_tracks();
    assert_eq!(t.len(), 1);
    assert_eq!(t[0].id, "near");
    assert_eq!(t[0].questions, 8);
    assert_eq!(t[0].pass_score, 6);
}
