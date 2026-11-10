//! NEP-141 (core + resolver), NEP-145 (storage management), NEP-148 (metadata).
//! Thin wrappers over `near-contract-standards`, plus burn accounting for the two standard
//! code paths that can destroy tokens (forced unregister, refund to a deleted sender).
use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_contract_standards::fungible_token::events::FtBurn;
use near_contract_standards::fungible_token::metadata::{
    FungibleTokenMetadata, FungibleTokenMetadataProvider,
};
use near_contract_standards::fungible_token::resolver::FungibleTokenResolver;
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::json_types::U128;
use near_sdk::{AccountId, NearToken, PromiseOrValue, env, near, require};

use crate::types::ActivityKind;
use crate::{Contract, ContractExt};

#[near]
impl FungibleTokenCore for Contract {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenResolver for Contract {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let (used, burned) =
            self.token.internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        if burned > 0 {
            self.total_burned += burned;
            self.log_activity(ActivityKind::OtherBurn, None, Some(sender_id), burned, "refund-to-deleted-sender");
        }
        used.into()
    }
}

#[near]
impl StorageManagement for Contract {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        let caller = env::predecessor_account_id();
        require!(caller != env::current_account_id(), "treasury cannot unregister");
        if let Some((account, balance)) = self.token.internal_storage_unregister(force) {
            if balance > 0 {
                self.total_burned += balance;
                FtBurn { owner_id: &account, amount: U128(balance), memo: Some("force-unregister") }
                    .emit();
                self.log_activity(ActivityKind::OtherBurn, None, Some(account), balance, "force-unregister");
            }
            true
        } else {
            false
        }
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.clone()
    }
}

impl Contract {
    /// Register `account` for FT storage if needed. Bytes are paid by the caller via `charge_storage`.
    pub(crate) fn ensure_registered(&mut self, account: &AccountId) {
        if !self.token.accounts.contains_key(account) {
            self.token.internal_register_account(account);
        }
    }
}
