//! Ship-to-chain: the smallest useful NEAR contract.
//! Stores a greeting and who last changed it. Deploy it to hello.<you>.testnet and submit it on Retr0 Academy.
use near_sdk::{env, log, near, AccountId, PanicOnDefault};

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    greeting: String,
    owner: AccountId,
    updated_by: AccountId,
}

#[near]
impl Contract {
    /// Called once, right after deploy.
    #[init]
    pub fn new(greeting: String) -> Self {
        let owner = env::predecessor_account_id();
        Self { greeting, updated_by: owner.clone(), owner }
    }

    /// Free view call: anyone can read it.
    pub fn get_greeting(&self) -> String {
        self.greeting.clone()
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner.clone()
    }

    /// Change call: needs a signed transaction. Only the owner may change the greeting.
    pub fn set_greeting(&mut self, greeting: String) {
        let caller = env::predecessor_account_id();
        assert_eq!(caller, self.owner, "Only the owner can change the greeting");
        assert!(greeting.len() <= 140, "Keep it under 140 bytes");
        log!("{} set the greeting to {}", caller, greeting);
        self.greeting = greeting;
        self.updated_by = caller;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    #[test]
    fn owner_can_update() {
        testing_env!(VMContextBuilder::new().predecessor_account_id(accounts(0)).build());
        let mut c = Contract::new("gm".into());
        c.set_greeting("shipped!".into());
        assert_eq!(c.get_greeting(), "shipped!");
    }

    #[test]
    #[should_panic(expected = "Only the owner")]
    fn stranger_cannot_update() {
        testing_env!(VMContextBuilder::new().predecessor_account_id(accounts(0)).build());
        let mut c = Contract::new("gm".into());
        testing_env!(VMContextBuilder::new().predecessor_account_id(accounts(1)).build());
        c.set_greeting("pwned".into());
    }
}
