└── contracts
    └── src
        ├── InfiniRewardsCollectible.cairo
        ├── InfiniRewardsFactory.cairo
        ├── InfiniRewardsMerchantAccount.cairo
        ├── InfiniRewardsPoints.cairo
        ├── InfiniRewardsUserAccount.cairo
        ├── components
            └── account.cairo
        ├── interfaces
            ├── IInfiniRewards.cairo
            ├── IInfiniRewardsMerchantAccount.cairo
            ├── IInfiniRewardsPoints.cairo
            ├── IInfiniRewardsUserAccount.cairo
            ├── permission.cairo
            ├── policy.cairo
            └── session_key.cairo
        ├── lib.cairo
        └── utils
            └── asserts.cairo


/contracts/src/InfiniRewardsCollectible.cairo:
--------------------------------------------------------------------------------
  1 | // SPDX-License-Identifier: MIT
  2 | // Compatible with OpenZeppelin Contracts for Cairo ^0.16.0
  3 | 
  4 | #[starknet::contract]
  5 | mod InfiniRewardsCollectible {
  6 |     use openzeppelin::access::ownable::OwnableComponent;
  7 |     use openzeppelin::introspection::src5::SRC5Component;
  8 |     use openzeppelin::security::pausable::PausableComponent;
  9 |     use openzeppelin::token::erc1155::ERC1155Component;
 10 |     use openzeppelin::upgrades::UpgradeableComponent;
 11 |     use openzeppelin::upgrades::interface::IUpgradeable;
 12 |     use starknet::ClassHash;
 13 |     use starknet::{ContractAddress, get_caller_address};
 14 |     use starknet::storage::{
 15 |         StoragePointerReadAccess, StoragePointerWriteAccess, Map, StoragePathEntry, Vec, VecTrait, MutableVecTrait
 16 |     };
 17 |     use core::assert;
 18 |     use starknet::syscalls::get_execution_info_syscall;
 19 |     use contracts::interfaces::IInfiniRewards::Errors;
 20 |     use contracts::interfaces::IInfiniRewardsPoints::IInfiniRewardsPointsDispatcher;
 21 |     use contracts::interfaces::IInfiniRewardsPoints::IInfiniRewardsPointsDispatcherTrait;
 22 | 
 23 |     component!(path: ERC1155Component, storage: erc1155, event: ERC1155Event);
 24 |     component!(path: SRC5Component, storage: src5, event: SRC5Event);
 25 |     component!(path: PausableComponent, storage: pausable, event: PausableEvent);
 26 |     component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
 27 |     component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
 28 | 
 29 |     #[abi(embed_v0)]
 30 |     impl ERC1155MixinImpl = ERC1155Component::ERC1155MixinImpl<ContractState>;
 31 |     #[abi(embed_v0)]
 32 |     impl PausableImpl = PausableComponent::PausableImpl<ContractState>;
 33 |     #[abi(embed_v0)]
 34 |     impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
 35 | 
 36 |     impl ERC1155InternalImpl = ERC1155Component::InternalImpl<ContractState>;
 37 |     impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;
 38 |     impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
 39 |     impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;
 40 | 
 41 |     #[storage]
 42 |     struct Storage {
 43 |         #[substorage(v0)]
 44 |         erc1155: ERC1155Component::Storage,
 45 |         #[substorage(v0)]
 46 |         src5: SRC5Component::Storage,
 47 |         #[substorage(v0)]
 48 |         pausable: PausableComponent::Storage,
 49 |         #[substorage(v0)]
 50 |         ownable: OwnableComponent::Storage,
 51 |         #[substorage(v0)]
 52 |         upgradeable: UpgradeableComponent::Storage,
 53 |         name: ByteArray,
 54 |         metadata: ByteArray,
 55 |         points_contract: ContractAddress,
 56 |         token_ids: Vec::<u256>,
 57 |         token_prices: Map::<u256, u256>,
 58 |         token_expiries: Map::<u256, u64>,
 59 |         token_metadatas: Map::<u256, ByteArray>,
 60 |         token_supplies: Map::<u256, u256>,
 61 |     }
 62 | 
 63 |     #[event]
 64 |     #[derive(Drop, starknet::Event)]
 65 |     enum Event {
 66 |         #[flat]
 67 |         ERC1155Event: ERC1155Component::Event,
 68 |         #[flat]
 69 |         SRC5Event: SRC5Component::Event,
 70 |         #[flat]
 71 |         PausableEvent: PausableComponent::Event,
 72 |         #[flat]
 73 |         OwnableEvent: OwnableComponent::Event,
 74 |         #[flat]
 75 |         UpgradeableEvent: UpgradeableComponent::Event,
 76 |     }
 77 | 
 78 |     #[constructor]
 79 |     fn constructor(
 80 |         ref self: ContractState,
 81 |         owner: ContractAddress,
 82 |         name: ByteArray,
 83 |         metadata: ByteArray
 84 |     ) {
 85 |         self.name.write(name);
 86 |         self.erc1155.initializer(self.name.read());
 87 |         self.ownable.initializer(owner);
 88 |         self.metadata.write(metadata);
 89 |     }
 90 | 
 91 |     impl ERC1155HooksImpl of ERC1155Component::ERC1155HooksTrait<ContractState> {
 92 |         fn before_update(
 93 |             ref self: ERC1155Component::ComponentState<ContractState>,
 94 |             from: ContractAddress,
 95 |             to: ContractAddress,
 96 |             token_ids: Span<u256>,
 97 |             values: Span<u256>,
 98 |         ) {
 99 |             let contract_state = ERC1155Component::HasComponent::get_contract(@self);
100 |             contract_state.pausable.assert_not_paused();
101 |         }
102 | 
103 |         fn after_update(
104 |             ref self: ERC1155Component::ComponentState<ContractState>,
105 |             from: ContractAddress,
106 |             to: ContractAddress,
107 |             token_ids: Span<u256>,
108 |             values: Span<u256>,
109 |         ) {
110 |         }
111 |     }
112 | 
113 |     #[abi(embed_v0)]
114 |     impl UpgradeableImpl of IUpgradeable<ContractState> {
115 |         fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
116 |             self.ownable.assert_only_owner();
117 |             self.upgradeable.upgrade(new_class_hash);
118 |         }
119 |     }
120 | 
121 |     #[generate_trait]
122 |     #[abi(per_item)]
123 |     impl ExternalImpl of ExternalTrait {
124 |         #[external(v0)]
125 |         fn pause(ref self: ContractState) {
126 |             self.ownable.assert_only_owner();
127 |             self.pausable.pause();
128 |         }
129 | 
130 |         #[external(v0)]
131 |         fn unpause(ref self: ContractState) {
132 |             self.ownable.assert_only_owner();
133 |             self.pausable.unpause();
134 |         }
135 | 
136 |         #[external(v0)]
137 |         fn burn(ref self: ContractState, account: ContractAddress, token_id: u256, value: u256) {
138 |             let caller = get_caller_address();
139 |             if account != caller {
140 |                 assert(self.erc1155.is_approved_for_all(account, caller), ERC1155Component::Errors::UNAUTHORIZED);
141 |             }
142 |             self.erc1155.burn(account, token_id, value);
143 |             let supply = self.token_supplies.entry(token_id).read();
144 |             self.token_supplies.entry(token_id).write(supply - value);
145 |         }
146 | 
147 |         #[external(v0)]
148 |         fn batch_burn(
149 |             ref self: ContractState,
150 |             account: ContractAddress,
151 |             token_ids: Span<u256>,
152 |             values: Span<u256>,
153 |         ) {
154 |             let caller = get_caller_address();
155 |             if account != caller {
156 |                 assert(self.erc1155.is_approved_for_all(account, caller), ERC1155Component::Errors::UNAUTHORIZED);
157 |             }
158 |             self.erc1155.batch_burn(account, token_ids, values);
159 |             for i in 0..token_ids.len() {
160 |                 let token_id = *token_ids.at(i);
161 |                 let supply = self.token_supplies.entry(token_id).read();
162 |                 self.token_supplies.entry(token_id).write(supply - *values.at(i));
163 |             };
164 |         }
165 | 
166 |         #[external(v0)]
167 |         fn mint(
168 |             ref self: ContractState,
169 |             account: ContractAddress,
170 |             token_id: u256,
171 |             value: u256,
172 |             data: Span<felt252>,
173 |         ) {
174 |             self.ownable.assert_only_owner();
175 |             let mut token_exists:bool = false;
176 |             for i in 0..self.token_ids.len() {
177 |                 let curr_token_id:u256 = self.token_ids.at(i).read();
178 |                 if curr_token_id == token_id {
179 |                     token_exists = true;
180 |                     break;
181 |                 }
182 |             };
183 |             assert(token_exists, Errors::COLLECTIBLE_NOT_EXIST);
184 |             let supply = self.token_supplies.entry(token_id).read();
185 |             self.token_supplies.entry(token_id).write(supply + value);
186 |             self.erc1155.mint_with_acceptance_check(account, token_id, value, data);
187 |         }
188 | 
189 |         #[external(v0)]
190 |         fn batch_mint(
191 |             ref self: ContractState,
192 |             account: ContractAddress,
193 |             token_ids: Span<u256>,
194 |             values: Span<u256>,
195 |             data: Span<felt252>,
196 |         ) {
197 |             self.ownable.assert_only_owner();
198 |             for i in 0..token_ids.len() {
199 |                 let token_id = *token_ids.at(i);
200 |                 let supply = self.token_supplies.entry(token_id).read();
201 |                 self.token_supplies.entry(token_id).write(supply + *values.at(i));
202 |             };
203 |             self.erc1155.batch_mint_with_acceptance_check(account, token_ids, values, data);
204 |         }
205 | 
206 |         #[external(v0)]
207 |         fn set_base_uri(ref self: ContractState, base_uri: ByteArray) {
208 |             self.ownable.assert_only_owner();
209 |             self.erc1155._set_base_uri(base_uri);
210 |         }
211 | 
212 |         #[external(v0)]
213 |         fn set_token_data(ref self: ContractState, token_id: u256, points_contract: ContractAddress, price: u256, expiry: u64, metadata: ByteArray) {
214 |             self.ownable.assert_only_owner();
215 |             self.points_contract.write(points_contract);
216 |             let mut token_exists:bool = false;
217 |             for i in 0..self.token_ids.len() {
218 |                 let curr_token_id:u256 = self.token_ids.at(i).read();
219 |                 if curr_token_id == token_id {
220 |                     token_exists = true;
221 |                     break;
222 |                 }
223 |             };
224 |             if !token_exists {
225 |                 self.token_ids.push(token_id);
226 |             }
227 |             self.token_prices.entry(token_id).write(price);
228 |             self.token_expiries.entry(token_id).write(expiry);
229 |             self.token_metadatas.entry(token_id).write(metadata);
230 |         }
231 | 
232 |         #[external(v0)]
233 |         fn get_token_data(ref self: ContractState, token_id: u256) -> (ContractAddress, u256, u64, ByteArray, u256) {
234 |             (self.points_contract.read(), self.token_prices.entry(token_id).read(), self.token_expiries.entry(token_id).read(), self.token_metadatas.entry(token_id).read(), self.token_supplies.entry(token_id).read())
235 |         }
236 | 
237 |         #[external(v0)]
238 |         fn redeem(ref self: ContractState, user: ContractAddress, token_id: u256, amount: u256) {
239 |             let current_timestamp: u64 = get_execution_info_syscall().unwrap().unbox().block_info.block_timestamp;
240 |             assert(self.token_expiries.entry(token_id).read() > current_timestamp, Errors::COLLECTIBLE_EXPIRED);
241 |             self.erc1155.burn(user, token_id, amount);
242 |             let supply = self.token_supplies.entry(token_id).read();
243 |             self.token_supplies.entry(token_id).write(supply - amount);
244 |         }
245 | 
246 |         #[external(v0)]
247 |         fn purchase(ref self: ContractState, user: ContractAddress, token_id: u256, amount: u256) {
248 |             let current_timestamp: u64 = get_execution_info_syscall().unwrap().unbox().block_info.block_timestamp;
249 |             assert(self.token_expiries.entry(token_id).read() > current_timestamp, Errors::COLLECTIBLE_EXPIRED);
250 |             assert(amount > 0, Errors::INVALID_AMOUNT);
251 |             let price = self.token_prices.entry(token_id).read();
252 |             assert(price > 0, Errors::NOT_FOR_SALE);
253 |             if price > 0 {
254 |                 let points_contract = self.points_contract.read();
255 |                 let points_to_deduct = price * amount;
256 |                 
257 |                 let points_contract_dispatcher = IInfiniRewardsPointsDispatcher {
258 |                     contract_address: points_contract
259 |                 };
260 |                 
261 |                 let success = points_contract_dispatcher.burn(user, points_to_deduct);
262 |                 assert(success, Errors::INSUFFICIENT_BALANCE);
263 |             }
264 |             let supply = self.token_supplies.entry(token_id).read();
265 |             self.token_supplies.entry(token_id).write(supply + amount);
266 |             self.erc1155.mint_with_acceptance_check(user, token_id, amount, ArrayTrait::new().span());
267 |         }
268 | 
269 |         #[external(v0)]
270 |         fn get_details(self: @ContractState) -> (ByteArray, ByteArray, ContractAddress, Array::<u256>, Array::<u256>, Array::<u64>, Array::<ByteArray>, Array::<u256>) {
271 |             let mut token_ids: Array::<u256> = array![];
272 |             let mut token_prices: Array::<u256> = array![];
273 |             let mut token_expiries: Array::<u64> = array![];
274 |             let mut token_metadatas: Array::<ByteArray> = array![];
275 |             let mut token_supplies: Array::<u256> = array![];
276 |             for i in 0..self.token_ids.len() {
277 |                 let token_id = self.token_ids.at(i).read();
278 |                 token_ids.append(token_id);
279 |                 token_prices.append(self.token_prices.entry(token_id).read());
280 |                 token_expiries.append(self.token_expiries.entry(token_id).read());
281 |                 token_metadatas.append(self.token_metadatas.entry(token_id).read());
282 |                 token_supplies.append(self.token_supplies.entry(token_id).read());
283 |             };
284 |             (
285 |                 self.name.read(),
286 |                 self.metadata.read(),
287 |                 self.points_contract.read(),
288 |                 token_ids,
289 |                 token_prices,
290 |                 token_expiries,
291 |                 token_metadatas,
292 |                 token_supplies
293 |             )
294 |         }
295 | 
296 |         #[external(v0)]
297 |         fn is_valid(self: @ContractState, token_id: u256) -> bool {
298 |             let current_timestamp: u64 = get_execution_info_syscall().unwrap().unbox().block_info.block_timestamp;
299 |             self.token_expiries.entry(token_id).read() > current_timestamp
300 |         }
301 | 
302 |         #[external(v0)]
303 |         fn set_points_contract(ref self: ContractState, points_contract: ContractAddress) {
304 |             self.ownable.assert_only_owner();
305 |             self.points_contract.write(points_contract);
306 |         }
307 | 
308 |         #[external(v0)]
309 |         fn set_details(ref self: ContractState, name: ByteArray, metadata: ByteArray) {
310 |             self.ownable.assert_only_owner();
311 |             self.name.write(name);
312 |             self.metadata.write(metadata);
313 |         }
314 |     }
315 | 
316 | }
317 | 


--------------------------------------------------------------------------------
/contracts/src/InfiniRewardsFactory.cairo:
--------------------------------------------------------------------------------
  1 | // SPDX-License-Identifier: MIT
  2 | 
  3 | #[starknet::contract]
  4 | mod InfiniRewardsFactory {
  5 |     use openzeppelin::access::ownable::OwnableComponent;
  6 |     use openzeppelin::security::pausable::PausableComponent;
  7 |     use openzeppelin::upgrades::UpgradeableComponent;
  8 |     use openzeppelin::upgrades::interface::IUpgradeable;
  9 |     use starknet::{ClassHash, ContractAddress, get_caller_address};
 10 |     use starknet::storage::{
 11 |         StoragePointerReadAccess, StoragePointerWriteAccess
 12 |     };
 13 |     use starknet::syscalls::deploy_syscall;
 14 |     use contracts::interfaces::IInfiniRewardsMerchantAccount::{IInfiniRewardsMerchantAccountDispatcherTrait, IInfiniRewardsMerchantAccountDispatcher};
 15 |     use contracts::interfaces::IInfiniRewardsUserAccount::{IInfiniRewardsUserAccountDispatcherTrait, IInfiniRewardsUserAccountDispatcher};
 16 | 
 17 |     component!(path: PausableComponent, storage: pausable, event: PausableEvent);
 18 |     component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
 19 |     component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
 20 | 
 21 |     #[abi(embed_v0)]
 22 |     impl PausableImpl = PausableComponent::PausableImpl<ContractState>;
 23 |     #[abi(embed_v0)]
 24 |     impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
 25 | 
 26 |     impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;
 27 |     impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
 28 |     impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;
 29 | 
 30 |     #[storage]
 31 |     struct Storage {
 32 |         #[substorage(v0)]
 33 |         pausable: PausableComponent::Storage,
 34 |         #[substorage(v0)]
 35 |         ownable: OwnableComponent::Storage,
 36 |         #[substorage(v0)]
 37 |         upgradeable: UpgradeableComponent::Storage,
 38 |         infini_rewards_points_hash: ClassHash,
 39 |         infini_rewards_collectible_hash: ClassHash,
 40 |         infini_rewards_user_account_hash: ClassHash,
 41 |         infini_rewards_merchant_account_hash: ClassHash,
 42 |         // user_accounts: Map::<felt252, ContractAddress>,
 43 |         // merchant_accounts: Map::<felt252, ContractAddress>,
 44 |     }
 45 | 
 46 |     #[event]
 47 |     #[derive(Drop, starknet::Event)]
 48 |     enum Event {
 49 |         #[flat]
 50 |         PausableEvent: PausableComponent::Event,
 51 |         #[flat]
 52 |         OwnableEvent: OwnableComponent::Event,
 53 |         #[flat]
 54 |         UpgradeableEvent: UpgradeableComponent::Event,
 55 |         UserCreated: UserCreated,
 56 |         MerchantCreated: MerchantCreated,
 57 |         PointsCreated: PointsCreated,
 58 |         CollectibleCreated: CollectibleCreated,
 59 |     }
 60 | 
 61 |     #[derive(Drop, starknet::Event)]
 62 |     struct UserCreated {
 63 |         user: ContractAddress,
 64 |         metadata: ByteArray,
 65 |     }
 66 | 
 67 |     #[derive(Drop, starknet::Event)]
 68 |     struct MerchantCreated {
 69 |         merchant: ContractAddress,
 70 |         points_contract: ContractAddress,
 71 |     }
 72 | 
 73 |     #[derive(Drop, starknet::Event)]
 74 |     struct PointsCreated {
 75 |         points_contract: ContractAddress,
 76 |         merchant: ContractAddress,
 77 |     }
 78 | 
 79 |     #[derive(Drop, starknet::Event)]
 80 |     struct CollectibleCreated {
 81 |         collectible_contract: ContractAddress,
 82 |         merchant: ContractAddress,
 83 |     }
 84 | 
 85 |     #[constructor]
 86 |     fn constructor(
 87 |         ref self: ContractState,
 88 |         infini_rewards_points_hash: ClassHash,
 89 |         infini_rewards_collectible_hash: ClassHash,
 90 |         infini_rewards_user_account_hash: ClassHash,
 91 |         infini_rewards_merchant_account_hash: ClassHash,
 92 |         owner: ContractAddress
 93 |     ) {
 94 |         self.infini_rewards_points_hash.write(infini_rewards_points_hash);
 95 |         self.infini_rewards_collectible_hash.write(infini_rewards_collectible_hash);
 96 |         self.infini_rewards_user_account_hash.write(infini_rewards_user_account_hash);
 97 |         self.infini_rewards_merchant_account_hash.write(infini_rewards_merchant_account_hash);
 98 |         self.ownable.initializer(owner);
 99 |     }
100 | 
101 |     #[abi(embed_v0)]
102 |     impl UpgradeableImpl of IUpgradeable<ContractState> {
103 |         fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
104 |             self.ownable.assert_only_owner();
105 |             self.upgradeable.upgrade(new_class_hash);
106 |         }
107 |     }
108 | 
109 |     #[generate_trait]
110 |     #[abi(per_item)]
111 |     impl ExternalImpl of ExternalTrait {
112 |         #[external(v0)]
113 |         fn pause(ref self: ContractState) {
114 |             self.ownable.assert_only_owner();
115 |             self.pausable.pause();
116 |         }
117 | 
118 |         #[external(v0)]
119 |         fn unpause(ref self: ContractState) {
120 |             self.ownable.assert_only_owner();
121 |             self.pausable.unpause();
122 |         }
123 | 
124 |         #[external(v0)]
125 |         fn create_user(
126 |             ref self: ContractState,
127 |             public_key: felt252,
128 |             metadata: ByteArray
129 |         ) -> ContractAddress {
130 |             // assert(self.user_accounts.read(phone_number_hash).is_zero(), 'User already exists');
131 |             
132 |             let mut constructor_calldata = ArrayTrait::new();
133 |             public_key.serialize(ref constructor_calldata);
134 |             let (new_account, _) = deploy_syscall(
135 |                     self.infini_rewards_user_account_hash.read(), public_key, constructor_calldata.span(), true
136 |                 )
137 |                     .expect('failed to deploy account');
138 |             // self.user_accounts.write(phone_number_hash, new_account);
139 |             let user_account_instance = IInfiniRewardsUserAccountDispatcher { contract_address: new_account };
140 |             user_account_instance.set_metadata(metadata.clone());
141 |             self.emit(UserCreated { user: new_account, metadata });
142 |             new_account
143 |         }
144 | 
145 |         #[external(v0)]
146 |         fn create_merchant_contract(
147 |             ref self: ContractState,
148 |             public_key: felt252,
149 |             metadata: ByteArray,
150 |             name: ByteArray,
151 |             symbol: ByteArray,
152 |             decimals: u8
153 |         ) -> (ContractAddress, ContractAddress) {
154 |             // Create user account first
155 |             // assert(self.merchant_accounts.read(phone_number_hash).is_zero(), 'Merchant already exists');
156 |             
157 |             let mut constructor_calldata = ArrayTrait::new();
158 |             public_key.serialize(ref constructor_calldata);
159 |             let (merchant, _) = deploy_syscall(
160 |                     self.infini_rewards_merchant_account_hash.read(), public_key, constructor_calldata.span(), true
161 |                 )
162 |                     .expect('failed to deploy account');
163 | 
164 |             // Deploy Points Contract within Merchant Account
165 |             let mut points_calldata = ArrayTrait::new();
166 |             merchant.serialize(ref points_calldata);
167 |             name.serialize(ref points_calldata);
168 |             symbol.serialize(ref points_calldata);
169 |             let mut points_metadata = Default::default();
170 |             points_metadata.append_word(0xb900016b6465736372697074696f6e6e44656661756c7420506f696e7473, 30); // Default Points Metadata: {"description":"Default Points"}
171 |             points_metadata.serialize(ref points_calldata);
172 |             decimals.serialize(ref points_calldata);
173 |             let (points_contract, _) = deploy_syscall(
174 |                     self.infini_rewards_points_hash.read(), 
175 |                     0, 
176 |                     points_calldata.span(), 
177 |                     false
178 |                 )
179 |                     .expect('failed to deploy points');
180 |             // Initialize merchant account with points contract
181 |             let merchant_account_instance = IInfiniRewardsMerchantAccountDispatcher { contract_address: merchant };
182 |             merchant_account_instance.add_points_contract(points_contract);
183 |             merchant_account_instance.set_metadata(metadata.clone());
184 | 
185 |             self.emit(MerchantCreated { merchant, points_contract });
186 |             (merchant, points_contract)
187 |         }
188 | 
189 |         #[external(v0)]
190 |         fn create_points_contract(
191 |             ref self: ContractState,
192 |             name: ByteArray,
193 |             symbol: ByteArray,
194 |             metadata: ByteArray,
195 |             decimals: u8
196 |         ) -> ContractAddress {           
197 |             let mut constructor_calldata = ArrayTrait::new();
198 |             let merchant: ContractAddress = get_caller_address();
199 |             merchant.serialize(ref constructor_calldata);
200 |             name.serialize(ref constructor_calldata);
201 |             symbol.serialize(ref constructor_calldata);
202 |             metadata.serialize(ref constructor_calldata);
203 |             decimals.serialize(ref constructor_calldata);
204 |             let (new_contract, _) = deploy_syscall(
205 |                     self.infini_rewards_points_hash.read(), 0, constructor_calldata.span(), false
206 |                 )
207 |                     .expect('failed to deploy points');
208 |             let merchant_account_instance = IInfiniRewardsMerchantAccountDispatcher { contract_address: merchant };
209 |             merchant_account_instance.add_points_contract(new_contract);
210 |             self.emit(PointsCreated { points_contract: new_contract, merchant });
211 |             new_contract
212 |         }
213 | 
214 |         #[external(v0)]
215 |         fn create_collectible_contract(
216 |             ref self: ContractState,
217 |             name: ByteArray,
218 |             metadata: ByteArray,
219 |         ) -> ContractAddress {
220 |             let mut constructor_calldata = ArrayTrait::new();
221 |             let merchant = get_caller_address();
222 |             merchant.serialize(ref constructor_calldata);
223 |             name.serialize(ref constructor_calldata);
224 |             metadata.serialize(ref constructor_calldata);
225 | 
226 |             let (new_contract, _) = deploy_syscall(
227 |                 self.infini_rewards_collectible_hash.read(),
228 |                 0,
229 |                 constructor_calldata.span(),
230 |                 false
231 |             ).expect('deploy failed');
232 | 
233 |             let merchant_account_instance = IInfiniRewardsMerchantAccountDispatcher { contract_address: merchant };
234 |             merchant_account_instance.add_collectible_contract(new_contract);
235 |             self.emit(CollectibleCreated { collectible_contract: new_contract, merchant });
236 |             new_contract
237 |         }
238 | 
239 |         #[external(v0)]
240 |         fn get_user_class_hash(self: @ContractState) -> ClassHash {
241 |             self.infini_rewards_user_account_hash.read()
242 |         }
243 | 
244 |         #[external(v0)]
245 |         fn set_user_class_hash(ref self: ContractState, class_hash: ClassHash) {
246 |             self.ownable.assert_only_owner();
247 |             self.infini_rewards_user_account_hash.write(class_hash);
248 |         }
249 | 
250 |         #[external(v0)]
251 |         fn get_merchant_class_hash(self: @ContractState) -> ClassHash {
252 |             self.infini_rewards_merchant_account_hash.read()
253 |         }
254 | 
255 |         #[external(v0)]
256 |         fn set_merchant_class_hash(ref self: ContractState, class_hash: ClassHash) {
257 |             self.ownable.assert_only_owner();
258 |             self.infini_rewards_merchant_account_hash.write(class_hash);
259 |         }
260 | 
261 |         #[external(v0)]
262 |         fn get_points_class_hash(self: @ContractState) -> ClassHash {
263 |             self.infini_rewards_points_hash.read()
264 |         }
265 | 
266 |         #[external(v0)]
267 |         fn set_points_class_hash(ref self: ContractState, class_hash: ClassHash) {
268 |             self.ownable.assert_only_owner();
269 |             self.infini_rewards_points_hash.write(class_hash);
270 |         }
271 | 
272 |         #[external(v0)]
273 |         fn get_collectible_class_hash(self: @ContractState) -> ClassHash {
274 |             self.infini_rewards_collectible_hash.read()
275 |         }
276 | 
277 |         #[external(v0)]
278 |         fn set_collectible_class_hash(ref self: ContractState, class_hash: ClassHash) {
279 |             self.ownable.assert_only_owner();
280 |             self.infini_rewards_collectible_hash.write(class_hash);
281 |         }
282 |     }
283 | }
284 | 


--------------------------------------------------------------------------------
/contracts/src/InfiniRewardsMerchantAccount.cairo:
--------------------------------------------------------------------------------
  1 | // SPDX-License-Identifier: MIT
  2 | 
  3 | #[starknet::contract(account)]
  4 | mod InfiniRewardsMerchantAccount {
  5 |     use contracts::components::account::AccountComponent;
  6 |     use openzeppelin::introspection::src5::SRC5Component;
  7 |     use openzeppelin::upgrades::UpgradeableComponent;
  8 |     use openzeppelin::upgrades::interface::IUpgradeable;
  9 |     use starknet::{ClassHash, ContractAddress};
 10 |     use starknet::storage::{
 11 |         StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait
 12 |     };
 13 |     use contracts::interfaces::IInfiniRewardsMerchantAccount::IInfiniRewardsMerchantAccount;
 14 | 
 15 |     component!(path: AccountComponent, storage: account, event: AccountEvent);
 16 |     component!(path: SRC5Component, storage: src5, event: SRC5Event);
 17 |     component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
 18 | 
 19 |     #[abi(embed_v0)]
 20 |     impl SRC6Impl = AccountComponent::SRC6Impl<ContractState>;
 21 |     #[abi(embed_v0)]
 22 |     impl SRC6CamelOnlyImpl = AccountComponent::SRC6CamelOnlyImpl<ContractState>;
 23 |     #[abi(embed_v0)]
 24 |     impl DeclarerImpl = AccountComponent::DeclarerImpl<ContractState>;
 25 |     #[abi(embed_v0)]
 26 |     impl DeployableImpl = AccountComponent::DeployableImpl<ContractState>;
 27 |     #[abi(embed_v0)]
 28 |     impl PublicKeyImpl = AccountComponent::PublicKeyImpl<ContractState>;
 29 |     #[abi(embed_v0)]
 30 |     impl PublicKeyCamelImpl = AccountComponent::PublicKeyCamelImpl<ContractState>;
 31 |     #[abi(embed_v0)]
 32 |     impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;
 33 | 
 34 |     impl AccountInternalImpl = AccountComponent::InternalImpl<ContractState>;
 35 |     impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;
 36 | 
 37 |     #[storage]
 38 |     struct Storage {
 39 |         #[substorage(v0)]
 40 |         account: AccountComponent::Storage,
 41 |         #[substorage(v0)]
 42 |         src5: SRC5Component::Storage,
 43 |         #[substorage(v0)]
 44 |         upgradeable: UpgradeableComponent::Storage,
 45 |         metadata: ByteArray,
 46 |         points_contracts: Vec<ContractAddress>,
 47 |         collectible_contracts: Vec<ContractAddress>,
 48 |     }
 49 | 
 50 |     #[event]
 51 |     #[derive(Drop, starknet::Event)]
 52 |     enum Event {
 53 |         #[flat]
 54 |         AccountEvent: AccountComponent::Event,
 55 |         #[flat]
 56 |         SRC5Event: SRC5Component::Event,
 57 |         #[flat]
 58 |         UpgradeableEvent: UpgradeableComponent::Event,
 59 |     }
 60 | 
 61 |     #[constructor]
 62 |     fn constructor(ref self: ContractState, public_key: felt252) {
 63 |         self.account.initializer(public_key);
 64 |     }
 65 | 
 66 |     #[abi(embed_v0)]
 67 |     impl UpgradeableImpl of IUpgradeable<ContractState> {
 68 |         fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
 69 |             self.account.assert_only_self();
 70 |             self.upgradeable.upgrade(new_class_hash);
 71 |         }
 72 |     }
 73 | 
 74 |     #[abi(embed_v0)]
 75 |     impl IInfiniRewardsMerchantAccountImpl of IInfiniRewardsMerchantAccount<ContractState> {
 76 |         fn add_points_contract(ref self: ContractState, points_contract: ContractAddress) {
 77 |             self.points_contracts.push(points_contract);
 78 |         }
 79 | 
 80 |         fn add_collectible_contract(
 81 |             ref self: ContractState, collectible_contract: ContractAddress
 82 |         ) {
 83 |             self.collectible_contracts.push(collectible_contract);
 84 |         }
 85 | 
 86 |         fn set_metadata(ref self: ContractState, metadata: ByteArray) {
 87 |             self.metadata.write(metadata);
 88 |         }
 89 |     }
 90 | 
 91 |     #[generate_trait]
 92 |     #[abi(per_item)]
 93 |     impl ExternalImpl of ExternalTrait {
 94 |         #[external(v0)]
 95 |         fn get_points_contracts(self: @ContractState) -> Array::<ContractAddress> {
 96 |             let mut addresses = array![];
 97 |             for i in 0
 98 |                 ..self
 99 |                     .points_contracts
100 |                     .len() {
101 |                         addresses.append(self.points_contracts.at(i).read());
102 |                     };
103 |             addresses
104 |         }
105 | 
106 |         #[external(v0)]
107 |         fn get_collectible_contracts(self: @ContractState) -> Array::<ContractAddress> {
108 |             let mut addresses = array![];
109 |             for i in 0
110 |                 ..self
111 |                     .collectible_contracts
112 |                     .len() {
113 |                         addresses.append(self.collectible_contracts.at(i).read());
114 |                     };
115 |             addresses
116 |         }
117 | 
118 |         #[external(v0)]
119 |         fn get_metadata(self: @ContractState) -> ByteArray {
120 |             self.metadata.read()
121 |         }
122 |     }
123 | }
124 | 


--------------------------------------------------------------------------------
/contracts/src/InfiniRewardsPoints.cairo:
--------------------------------------------------------------------------------
  1 | // SPDX-License-Identifier: MIT
  2 | // Compatible with OpenZeppelin Contracts for Cairo ^0.16.0
  3 | 
  4 | #[starknet::contract]
  5 | mod InfiniRewardsPoints {
  6 |     use openzeppelin::access::ownable::OwnableComponent;
  7 |     use openzeppelin::security::pausable::PausableComponent;
  8 |     use openzeppelin::token::erc20::ERC20Component;
  9 |     use openzeppelin::upgrades::UpgradeableComponent;
 10 |     use openzeppelin::upgrades::interface::IUpgradeable;
 11 |     use starknet::ClassHash;
 12 |     use starknet::ContractAddress;
 13 |     use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
 14 |     use starknet::get_caller_address;
 15 | 
 16 |     component!(path: ERC20Component, storage: erc20, event: ERC20Event);
 17 |     component!(path: PausableComponent, storage: pausable, event: PausableEvent);
 18 |     component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
 19 |     component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
 20 | 
 21 |     #[abi(embed_v0)]
 22 |     impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
 23 |     #[abi(embed_v0)]
 24 |     impl PausableImpl = PausableComponent::PausableImpl<ContractState>;
 25 |     #[abi(embed_v0)]
 26 |     impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
 27 | 
 28 |     impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;
 29 |     impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;
 30 |     impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
 31 |     impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;
 32 | 
 33 |     #[storage]
 34 |     struct Storage {
 35 |         #[substorage(v0)]
 36 |         erc20: ERC20Component::Storage,
 37 |         #[substorage(v0)]
 38 |         pausable: PausableComponent::Storage,
 39 |         #[substorage(v0)]
 40 |         ownable: OwnableComponent::Storage,
 41 |         #[substorage(v0)]
 42 |         upgradeable: UpgradeableComponent::Storage,
 43 |         name: ByteArray,
 44 |         symbol: ByteArray,
 45 |         metadata: ByteArray,
 46 |         decimals: u8,
 47 |     }
 48 | 
 49 |     #[event]
 50 |     #[derive(Drop, starknet::Event)]
 51 |     enum Event {
 52 |         #[flat]
 53 |         ERC20Event: ERC20Component::Event,
 54 |         #[flat]
 55 |         PausableEvent: PausableComponent::Event,
 56 |         #[flat]
 57 |         OwnableEvent: OwnableComponent::Event,
 58 |         #[flat]
 59 |         UpgradeableEvent: UpgradeableComponent::Event,
 60 |     }
 61 | 
 62 |     #[constructor]
 63 |     fn constructor(
 64 |         ref self: ContractState,
 65 |         owner: ContractAddress,
 66 |         name: ByteArray,
 67 |         symbol: ByteArray,
 68 |         metadata: ByteArray,
 69 |         decimals: u8
 70 |     ) {
 71 |         let name_clone = name.clone();
 72 |         let symbol_clone = symbol.clone();
 73 |         self.erc20.initializer(name_clone, symbol_clone);
 74 |         self.ownable.initializer(owner);
 75 |         self.name.write(name);
 76 |         self.symbol.write(symbol);
 77 |         self.metadata.write(metadata);
 78 |         self.decimals.write(decimals);
 79 |     }
 80 | 
 81 |     impl ERC20HooksImpl of ERC20Component::ERC20HooksTrait<ContractState> {
 82 |         fn before_update(
 83 |             ref self: ERC20Component::ComponentState<ContractState>,
 84 |             from: ContractAddress,
 85 |             recipient: ContractAddress,
 86 |             amount: u256,
 87 |         ) {
 88 |             let contract_state = ERC20Component::HasComponent::get_contract(@self);
 89 |             contract_state.pausable.assert_not_paused();
 90 |         }
 91 | 
 92 |         fn after_update(
 93 |             ref self: ERC20Component::ComponentState<ContractState>,
 94 |             from: ContractAddress,
 95 |             recipient: ContractAddress,
 96 |             amount: u256,
 97 |         ) {
 98 |         }
 99 |     }
100 | 
101 |     #[abi(embed_v0)]
102 |     impl UpgradeableImpl of IUpgradeable<ContractState> {
103 |         fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
104 |             self.ownable.assert_only_owner();
105 |             self.upgradeable.upgrade(new_class_hash);
106 |         }
107 |     }
108 | 
109 |     #[generate_trait]
110 |     #[abi(per_item)]
111 |     impl ExternalImpl of ExternalTrait {
112 |         #[external(v0)]
113 |         fn pause(ref self: ContractState) {
114 |             self.ownable.assert_only_owner();
115 |             self.pausable.pause();
116 |         }
117 | 
118 |         #[external(v0)]
119 |         fn unpause(ref self: ContractState) {
120 |             self.ownable.assert_only_owner();
121 |             self.pausable.unpause();
122 |         }
123 | 
124 |         #[external(v0)]
125 |         fn burn(ref self: ContractState, value: u256) {
126 |             self.erc20.burn(get_caller_address(), value);
127 |         }
128 | 
129 |         #[external(v0)]
130 |         fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
131 |             self.ownable.assert_only_owner();
132 |             self.erc20.mint(recipient, amount);
133 |         }
134 | 
135 |         #[external(v0)]
136 |         fn update_metadata(ref self: ContractState, metadata: ByteArray) {
137 |             self.ownable.assert_only_owner();
138 |             self.metadata.write(metadata);
139 |         }
140 | 
141 |         #[external(v0)]
142 |         fn get_details(self: @ContractState) -> (ByteArray, ByteArray, ByteArray, u8, u256) {
143 |             (self.name.read(), self.symbol.read(), self.metadata.read(), self.decimals.read(), self.erc20.total_supply())
144 |         }
145 |     }
146 | }
147 | 


--------------------------------------------------------------------------------
/contracts/src/InfiniRewardsUserAccount.cairo:
--------------------------------------------------------------------------------
 1 | // SPDX-License-Identifier: MIT
 2 | // Compatible with OpenZeppelin Contracts for Cairo ^0.17.0
 3 | 
 4 | #[starknet::contract(account)]
 5 | mod InfiniRewardsUserAccount {
 6 |     use contracts::components::account::AccountComponent;
 7 |     use openzeppelin::introspection::src5::SRC5Component;
 8 |     use openzeppelin::upgrades::UpgradeableComponent;
 9 |     use openzeppelin::upgrades::interface::IUpgradeable;
10 |     use starknet::storage::{StoragePointerWriteAccess, StoragePointerReadAccess};
11 |     use contracts::interfaces::IInfiniRewardsUserAccount::IInfiniRewardsUserAccount;
12 |     use starknet::ClassHash;
13 | 
14 |     component!(path: AccountComponent, storage: account, event: AccountEvent);
15 |     component!(path: SRC5Component, storage: src5, event: SRC5Event);
16 |     component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
17 | 
18 |     #[abi(embed_v0)]
19 |     impl SRC6Impl = AccountComponent::SRC6Impl<ContractState>;
20 |     #[abi(embed_v0)]
21 |     impl SRC6CamelOnlyImpl = AccountComponent::SRC6CamelOnlyImpl<ContractState>;
22 |     #[abi(embed_v0)]
23 |     impl DeclarerImpl = AccountComponent::DeclarerImpl<ContractState>;
24 |     #[abi(embed_v0)]
25 |     impl DeployableImpl = AccountComponent::DeployableImpl<ContractState>;
26 |     #[abi(embed_v0)]
27 |     impl PublicKeyImpl = AccountComponent::PublicKeyImpl<ContractState>;
28 |     #[abi(embed_v0)]
29 |     impl PublicKeyCamelImpl = AccountComponent::PublicKeyCamelImpl<ContractState>;
30 |     #[abi(embed_v0)]
31 |     impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;
32 | 
33 |     impl AccountInternalImpl = AccountComponent::InternalImpl<ContractState>;
34 |     impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;
35 | 
36 |     #[storage]
37 |     struct Storage {
38 |         #[substorage(v0)]
39 |         account: AccountComponent::Storage,
40 |         #[substorage(v0)]
41 |         src5: SRC5Component::Storage,
42 |         #[substorage(v0)]
43 |         upgradeable: UpgradeableComponent::Storage,
44 |         metadata: ByteArray,
45 |     }
46 | 
47 |     #[event]
48 |     #[derive(Drop, starknet::Event)]
49 |     enum Event {
50 |         #[flat]
51 |         AccountEvent: AccountComponent::Event,
52 |         #[flat]
53 |         SRC5Event: SRC5Component::Event,
54 |         #[flat]
55 |         UpgradeableEvent: UpgradeableComponent::Event,
56 |     }
57 | 
58 |     #[constructor]
59 |     fn constructor(ref self: ContractState, public_key: felt252) {
60 |         self.account.initializer(public_key);
61 |     }
62 | 
63 |     #[abi(embed_v0)]
64 |     impl IInfiniRewardsUserAccountImpl of IInfiniRewardsUserAccount<ContractState> {
65 |         fn set_metadata(ref self: ContractState, metadata: ByteArray) {
66 |             self.metadata.write(metadata);
67 |         }
68 |     }
69 | 
70 |     #[abi(embed_v0)]
71 |     impl UpgradeableImpl of IUpgradeable<ContractState> {
72 |         fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
73 |             self.account.assert_only_self();
74 |             self.upgradeable.upgrade(new_class_hash);
75 |         }
76 |     }
77 | 
78 |     #[generate_trait]
79 |     #[abi(per_item)]
80 |     impl ExternalImpl of ExternalTrait {
81 |         #[external(v0)]
82 |         fn get_metadata(self: @ContractState) -> ByteArray {
83 |             self.metadata.read()
84 |         }
85 |     }
86 | }
87 | 


--------------------------------------------------------------------------------
/contracts/src/components/account.cairo:
--------------------------------------------------------------------------------
  1 | // SPDX-License-Identifier: MIT
  2 | // OpenZeppelin Contracts for Cairo v0.20.0 (account/account.cairo)
  3 | 
  4 | use starknet::account::Call;
  5 | use starknet::ContractAddress;
  6 | use contracts::interfaces::session_key::{SessionData, SessionResult};
  7 | use contracts::interfaces::permission::{AccessMode, PermissionResult};
  8 | use contracts::interfaces::policy::{Policy};
  9 | 
 10 | #[starknet::interface]
 11 | pub trait AccountABI<TState> {
 12 |     // ISRC6
 13 |     fn __execute__(self: @TState, calls: Array<Call>) -> Array<Span<felt252>>;
 14 |     fn __validate__(ref self: TState, calls: Array<Call>) -> felt252;
 15 |     fn is_valid_signature(self: @TState, hash: felt252, signature: Array<felt252>) -> felt252;
 16 | 
 17 |     // ISRC5
 18 |     fn supports_interface(self: @TState, interface_id: felt252) -> bool;
 19 | 
 20 |     // IDeclarer
 21 |     fn __validate_declare__(self: @TState, class_hash: felt252) -> felt252;
 22 | 
 23 |     // IDeployable
 24 |     fn __validate_deploy__(
 25 |         self: @TState, class_hash: felt252, contract_address_salt: felt252, public_key: felt252,
 26 |     ) -> felt252;
 27 | 
 28 |     // IPublicKey
 29 |     fn get_public_key(self: @TState) -> felt252;
 30 |     fn set_public_key(ref self: TState, new_public_key: felt252, signature: Span<felt252>);
 31 | 
 32 |     // ISRC6CamelOnly
 33 |     fn isValidSignature(self: @TState, hash: felt252, signature: Array<felt252>) -> felt252;
 34 | 
 35 |     // IPublicKeyCamel
 36 |     fn getPublicKey(self: @TState) -> felt252;
 37 |     fn setPublicKey(ref self: TState, newPublicKey: felt252, signature: Span<felt252>);
 38 | 
 39 |     // ISession
 40 |     fn register_session(ref self: TState, session: SessionData, guid_or_address: felt252);
 41 |     fn revoke_session(ref self: TState, public_key: felt252);
 42 |     fn is_session_registered(self: @TState, public_key: felt252, guid_or_address: felt252) -> bool;
 43 |     fn get_all_sessions(self: @TState) -> Array<felt252>;
 44 |     fn get_session(self: @TState, public_key: felt252) -> Option<SessionResult>;
 45 | 
 46 |     // IPermission
 47 |     fn set_permission(ref self: TState, public_key: felt252, contract: ContractAddress, mode: AccessMode, selectors: Array<felt252>);
 48 |     fn get_permission_details(self: @TState, public_key: felt252, contract: ContractAddress) -> PermissionResult;
 49 | 
 50 |     // IPolicy
 51 |     fn set_policy(ref self: TState, public_key: felt252, contract: ContractAddress, policy: Policy);
 52 |     fn get_policy(self: @TState, public_key: felt252, contract: ContractAddress) -> Option<Policy>;
 53 | }
 54 | 
 55 | /// # Account Component
 56 | ///
 57 | /// The Account component enables contracts to behave as accounts.
 58 | #[starknet::component]
 59 | pub mod AccountComponent {
 60 |     use core::hash::{HashStateExTrait, HashStateTrait};
 61 |     use core::num::traits::Zero;
 62 |     use core::poseidon::PoseidonTrait;
 63 |     use openzeppelin::account::interface;
 64 |     use openzeppelin::account::utils::{execute_calls, is_tx_version_valid, is_valid_stark_signature};
 65 |     use openzeppelin::introspection::src5::SRC5Component;
 66 |     use openzeppelin::introspection::src5::SRC5Component::InternalTrait as SRC5InternalTrait;
 67 |     use openzeppelin::introspection::src5::SRC5Component::SRC5Impl;
 68 |     use starknet::account::Call;
 69 |     use starknet::{
 70 |         get_block_timestamp,
 71 |         get_execution_info,
 72 |         get_contract_address,
 73 |         get_tx_info,
 74 |         ContractAddress,
 75 |         VALIDATED,
 76 |     };
 77 |     use starknet::storage::{Map, Vec, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, VecTrait, MutableVecTrait};
 78 |     use contracts::interfaces::session_key::{Session, ISession, SessionData, SessionResult};
 79 |     use contracts::interfaces::permission::{AccessMode, IPermission, PermissionResult};
 80 |     use contracts::interfaces::policy::{Policy, IPolicy, PolicyResult};
 81 |     use contracts::utils::asserts::assert_no_self_call;
 82 |     use core::ecdsa;
 83 |     use super::AccountABI;
 84 | 
 85 | 
 86 |     #[storage]
 87 |     pub struct Storage {
 88 |         pub Account_public_key: felt252,
 89 |         pub sessions: Map<felt252, Session>,
 90 |         sessions_vec: Vec<felt252>,
 91 |         valid_session_cache: Map<(felt252, felt252), bool>,
 92 |     }
 93 | 
 94 |     #[event]
 95 |     #[derive(Drop, PartialEq, starknet::Event)]
 96 |     pub enum Event {
 97 |         OwnerAdded: OwnerAdded,
 98 |         OwnerRemoved: OwnerRemoved,
 99 |         SessionRegistered: SessionRegistered,
100 |         SessionRevoked: SessionRevoked,
101 |         PermissionUpdated: PermissionUpdated,
102 |         PolicyUpdated: PolicyUpdated
103 |     }
104 | 
105 |     #[derive(Drop, PartialEq, starknet::Event)]
106 |     pub struct OwnerAdded {
107 |         #[key]
108 |         pub new_owner_guid: felt252,
109 |     }
110 | 
111 |     #[derive(Drop, PartialEq, starknet::Event)]
112 |     pub struct OwnerRemoved {
113 |         #[key]
114 |         pub removed_owner_guid: felt252,
115 |     }
116 | 
117 |     #[derive(Drop, PartialEq, starknet::Event)]
118 |     struct SessionRegistered {
119 |         public_key: felt252,
120 |         guid_or_address: felt252
121 |     }
122 | 
123 |     #[derive(Drop, PartialEq, starknet::Event)]
124 |     struct SessionRevoked {
125 |         public_key: felt252
126 |     }
127 | 
128 |     #[derive(Drop, PartialEq, starknet::Event)]
129 |     struct PermissionUpdated {
130 |         public_key: felt252,
131 |         contract: ContractAddress
132 |     }
133 | 
134 |     #[derive(Drop, PartialEq, starknet::Event)]
135 |     struct PolicyUpdated {
136 |         public_key: felt252,
137 |         contract: ContractAddress
138 |     }
139 | 
140 |     pub mod Errors {
141 |         pub const INVALID_CALLER: felt252 = 'Account: invalid caller';
142 |         pub const INVALID_SIGNATURE: felt252 = 'Account: invalid signature';
143 |         pub const INVALID_TX_VERSION: felt252 = 'Account: invalid tx version';
144 |         pub const UNAUTHORIZED: felt252 = 'Account: unauthorized';
145 |         pub const INVALID_SESSION_SIGNATURE: felt252 = 'Invalid session signature';
146 |         pub const INVALID_SELECTOR: felt252 = 'Invalid selector';
147 |         pub const SESSION_EXPIRED: felt252 = 'Session expired';
148 |     }
149 | 
150 |     #[starknet::interface]
151 |     pub trait ISRC6<TState> {
152 |         fn __execute__(self: @TState, calls: Array<Call>) -> Array<Span<felt252>>;
153 |         fn __validate__(ref self: TState, calls: Array<Call>) -> felt252;
154 |         fn is_valid_signature(self: @TState, hash: felt252, signature: Array<felt252>) -> felt252;
155 |     }
156 | 
157 |     //
158 |     // External
159 |     //
160 | 
161 |     #[embeddable_as(SRC6Impl)]
162 |     impl SRC6<
163 |         TContractState,
164 |         +HasComponent<TContractState>,
165 |         +SRC5Component::HasComponent<TContractState>,
166 |         +Drop<TContractState>,
167 |     > of ISRC6<ComponentState<TContractState>> {
168 |         /// Executes a list of calls from the account.
169 |         ///
170 |         /// Requirements:
171 |         ///
172 |         /// - The transaction version must be greater than or equal to `MIN_TRANSACTION_VERSION`.
173 |         /// - If the transaction is a simulation (version >= `QUERY_OFFSET`), it must be
174 |         /// greater than or equal to `QUERY_OFFSET` + `MIN_TRANSACTION_VERSION`.
175 |         fn __execute__(
176 |             self: @ComponentState<TContractState>, calls: Array<Call>,
177 |         ) -> Array<Span<felt252>> {
178 |             // Avoid calls from other contracts
179 |             // https://github.com/OpenZeppelin/cairo-contracts/issues/344
180 |             let sender = starknet::get_caller_address();
181 |             assert(sender.is_zero(), Errors::INVALID_CALLER);
182 |             assert(is_tx_version_valid(), Errors::INVALID_TX_VERSION);
183 | 
184 |             let execution_info = get_execution_info().unbox();
185 |             let tx_info = execution_info.tx_info.unbox();
186 |             let tx_version: u256 = tx_info.version.try_into().unwrap();
187 |             let block_info = execution_info.block_info.unbox();
188 |             assert!(tx_version >= 1_u256, "Invalid tx version");
189 | 
190 |             // Check if it's a session transaction
191 |             if self.is_session(tx_info.signature) {
192 |                 let session_public_key: felt252 = *tx_info.signature[1];  // Keep public key in signature
193 |                 let session_entry = self.sessions.entry(session_public_key);
194 |                 let session_data = session_entry.data.read();
195 | 
196 |                 assert(block_info.block_timestamp < session_data.expires_at, 'Session expired');
197 |             }
198 | 
199 |             execute_calls(calls.span())
200 |         }
201 | 
202 |         /// Verifies the validity of the signature for the current transaction.
203 |         /// This function is used by the protocol to verify `invoke` transactions.
204 |         fn __validate__(ref self: ComponentState<TContractState>, calls: Array<Call>) -> felt252 {
205 |             let tx_info = get_tx_info().unbox();
206 |             assert(tx_info.paymaster_data.is_empty(), 'unsupported-paymaster');
207 | 
208 |             // Check if it's a session key signature
209 |             if self.is_session(tx_info.signature) {  // Need at least 4 elements for session signature
210 |                 // Try to validate as session transaction
211 |                 return self.validate_session_transaction( 
212 |                     calls.span(), 
213 |                     tx_info.signature,
214 |                     tx_info.transaction_hash
215 |                 );
216 |             }
217 |             return self.validate_transaction();
218 |             
219 |         }
220 | 
221 |         /// Verifies that the given signature is valid for the given hash.
222 |         fn is_valid_signature(
223 |             self: @ComponentState<TContractState>, hash: felt252, signature: Array<felt252>,
224 |         ) -> felt252 {
225 |             if self._is_valid_signature(hash, signature.span()) {
226 |                 starknet::VALIDATED
227 |             } else {
228 |                 0
229 |             }
230 |         }
231 |     }
232 | 
233 |     #[embeddable_as(DeclarerImpl)]
234 |     impl Declarer<
235 |         TContractState,
236 |         +HasComponent<TContractState>,
237 |         +SRC5Component::HasComponent<TContractState>,
238 |         +Drop<TContractState>,
239 |     > of interface::IDeclarer<ComponentState<TContractState>> {
240 |         /// Verifies the validity of the signature for the current transaction.
241 |         /// This function is used by the protocol to verify `declare` transactions.
242 |         fn __validate_declare__(
243 |             self: @ComponentState<TContractState>, class_hash: felt252,
244 |         ) -> felt252 {
245 |             self.validate_transaction()
246 |         }
247 |     }
248 | 
249 |     #[embeddable_as(DeployableImpl)]
250 |     impl Deployable<
251 |         TContractState,
252 |         +HasComponent<TContractState>,
253 |         +SRC5Component::HasComponent<TContractState>,
254 |         +Drop<TContractState>,
255 |     > of interface::IDeployable<ComponentState<TContractState>> {
256 |         /// Verifies the validity of the signature for the current transaction.
257 |         /// This function is used by the protocol to verify `deploy_account` transactions.
258 |         fn __validate_deploy__(
259 |             self: @ComponentState<TContractState>,
260 |             class_hash: felt252,
261 |             contract_address_salt: felt252,
262 |             public_key: felt252,
263 |         ) -> felt252 {
264 |             self.validate_transaction()
265 |         }
266 |     }
267 | 
268 |     #[embeddable_as(PublicKeyImpl)]
269 |     impl PublicKey<
270 |         TContractState,
271 |         +HasComponent<TContractState>,
272 |         +SRC5Component::HasComponent<TContractState>,
273 |         +Drop<TContractState>,
274 |     > of interface::IPublicKey<ComponentState<TContractState>> {
275 |         /// Returns the current public key of the account.
276 |         fn get_public_key(self: @ComponentState<TContractState>) -> felt252 {
277 |             self.Account_public_key.read()
278 |         }
279 | 
280 |         /// Sets the public key of the account to `new_public_key`.
281 |         ///
282 |         /// Requirements:
283 |         ///
284 |         /// - The caller must be the contract itself.
285 |         /// - The signature must be valid for the new owner.
286 |         ///
287 |         /// Emits both an `OwnerRemoved` and an `OwnerAdded` event.
288 |         fn set_public_key(
289 |             ref self: ComponentState<TContractState>,
290 |             new_public_key: felt252,
291 |             signature: Span<felt252>,
292 |         ) {
293 |             self.assert_only_self();
294 | 
295 |             let current_owner = self.Account_public_key.read();
296 |             self.assert_valid_new_owner(current_owner, new_public_key, signature);
297 | 
298 |             self.emit(OwnerRemoved { removed_owner_guid: current_owner });
299 |             self._set_public_key(new_public_key);
300 |         }
301 |     }
302 | 
303 |     /// Adds camelCase support for `ISRC6`.
304 |     #[embeddable_as(SRC6CamelOnlyImpl)]
305 |     impl SRC6CamelOnly<
306 |         TContractState,
307 |         +HasComponent<TContractState>,
308 |         +SRC5Component::HasComponent<TContractState>,
309 |         +Drop<TContractState>,
310 |     > of interface::ISRC6CamelOnly<ComponentState<TContractState>> {
311 |         fn isValidSignature(
312 |             self: @ComponentState<TContractState>, hash: felt252, signature: Array<felt252>,
313 |         ) -> felt252 {
314 |             SRC6::is_valid_signature(self, hash, signature)
315 |         }
316 |     }
317 | 
318 |     /// Adds camelCase support for `PublicKeyTrait`.
319 |     #[embeddable_as(PublicKeyCamelImpl)]
320 |     impl PublicKeyCamel<
321 |         TContractState,
322 |         +HasComponent<TContractState>,
323 |         +SRC5Component::HasComponent<TContractState>,
324 |         +Drop<TContractState>,
325 |     > of interface::IPublicKeyCamel<ComponentState<TContractState>> {
326 |         fn getPublicKey(self: @ComponentState<TContractState>) -> felt252 {
327 |             self.Account_public_key.read()
328 |         }
329 | 
330 |         fn setPublicKey(
331 |             ref self: ComponentState<TContractState>,
332 |             newPublicKey: felt252,
333 |             signature: Span<felt252>,
334 |         ) {
335 |             PublicKey::set_public_key(ref self, newPublicKey, signature);
336 |         }
337 |     }
338 | 
339 |     #[embeddable_as(AccountMixinImpl)]
340 |     impl AccountMixin<
341 |         TContractState,
342 |         +HasComponent<TContractState>,
343 |         impl SRC5: SRC5Component::HasComponent<TContractState>,
344 |         +Drop<TContractState>,
345 |     > of AccountABI<ComponentState<TContractState>> {
346 |         // ISRC6
347 |         fn __execute__(
348 |             self: @ComponentState<TContractState>, calls: Array<Call>,
349 |         ) -> Array<Span<felt252>> {
350 |             SRC6::__execute__(self, calls)
351 |         }
352 | 
353 |         fn __validate__(ref self: ComponentState<TContractState>, calls: Array<Call>) -> felt252 {
354 |             SRC6::__validate__(ref self, calls)
355 |         }
356 | 
357 |         fn is_valid_signature(
358 |             self: @ComponentState<TContractState>, hash: felt252, signature: Array<felt252>,
359 |         ) -> felt252 {
360 |             SRC6::is_valid_signature(self, hash, signature)
361 |         }
362 | 
363 |         // ISRC6CamelOnly
364 |         fn isValidSignature(
365 |             self: @ComponentState<TContractState>, hash: felt252, signature: Array<felt252>,
366 |         ) -> felt252 {
367 |             SRC6CamelOnly::isValidSignature(self, hash, signature)
368 |         }
369 | 
370 |         // IDeclarer
371 |         fn __validate_declare__(
372 |             self: @ComponentState<TContractState>, class_hash: felt252,
373 |         ) -> felt252 {
374 |             Declarer::__validate_declare__(self, class_hash)
375 |         }
376 | 
377 |         // IDeployable
378 |         fn __validate_deploy__(
379 |             self: @ComponentState<TContractState>,
380 |             class_hash: felt252,
381 |             contract_address_salt: felt252,
382 |             public_key: felt252,
383 |         ) -> felt252 {
384 |             Deployable::__validate_deploy__(self, class_hash, contract_address_salt, public_key)
385 |         }
386 | 
387 |         // IPublicKey
388 |         fn get_public_key(self: @ComponentState<TContractState>) -> felt252 {
389 |             PublicKey::get_public_key(self)
390 |         }
391 | 
392 |         fn set_public_key(
393 |             ref self: ComponentState<TContractState>,
394 |             new_public_key: felt252,
395 |             signature: Span<felt252>,
396 |         ) {
397 |             PublicKey::set_public_key(ref self, new_public_key, signature);
398 |         }
399 | 
400 |         // IPublicKeyCamel
401 |         fn getPublicKey(self: @ComponentState<TContractState>) -> felt252 {
402 |             PublicKeyCamel::getPublicKey(self)
403 |         }
404 | 
405 |         fn setPublicKey(
406 |             ref self: ComponentState<TContractState>,
407 |             newPublicKey: felt252,
408 |             signature: Span<felt252>,
409 |         ) {
410 |             PublicKeyCamel::setPublicKey(ref self, newPublicKey, signature);
411 |         }
412 | 
413 |         // ISRC5
414 |         fn supports_interface(
415 |             self: @ComponentState<TContractState>, interface_id: felt252,
416 |         ) -> bool {
417 |             let src5 = get_dep_component!(self, SRC5);
418 |             src5.supports_interface(interface_id)
419 |         }
420 | 
421 |         // ISession
422 |         fn register_session(
423 |             ref self: ComponentState<TContractState>,
424 |             session: SessionData,
425 |             guid_or_address: felt252
426 |         ) {
427 |             SessionInternalImpl::register_session(ref self, session, guid_or_address);
428 |         }
429 | 
430 |         fn revoke_session(
431 |             ref self: ComponentState<TContractState>,
432 |             public_key: felt252
433 |         ) {
434 |             SessionInternalImpl::revoke_session(ref self, public_key);
435 |         }
436 | 
437 |         fn is_session_registered(
438 |             self: @ComponentState<TContractState>,
439 |             public_key: felt252,
440 |             guid_or_address: felt252
441 |         ) -> bool {
442 |             SessionInternalImpl::is_session_registered(self, public_key, guid_or_address)
443 |         }
444 | 
445 |         fn get_all_sessions(self: @ComponentState<TContractState>) -> Array<felt252> {
446 |             SessionInternalImpl::get_all_sessions(self)
447 |         }
448 | 
449 |         fn get_session(self: @ComponentState<TContractState>, public_key: felt252) -> Option<SessionResult> {
450 |             SessionInternalImpl::get_session(self, public_key)
451 |         }
452 | 
453 |         // IPermission
454 |         fn set_permission(
455 |             ref self: ComponentState<TContractState>,
456 |             public_key: felt252,
457 |             contract: ContractAddress,
458 |             mode: AccessMode,
459 |             selectors: Array<felt252>
460 |         ) {
461 |             PermissionInternalImpl::set_permission(ref self, public_key, contract, mode, selectors);
462 |         }
463 | 
464 |         fn get_permission_details(
465 |             self: @ComponentState<TContractState>,
466 |             public_key: felt252,
467 |             contract: ContractAddress
468 |         ) -> PermissionResult {
469 |             PermissionInternalImpl::get_permission_details(self, public_key, contract)
470 |         }
471 | 
472 |         // IPolicy
473 |         fn set_policy(
474 |             ref self: ComponentState<TContractState>,
475 |             public_key: felt252,
476 |             contract: ContractAddress,
477 |             policy: Policy
478 |         ) {
479 |             PolicyInternalImpl::set_policy(ref self, public_key, contract, policy);
480 |         }
481 | 
482 |         fn get_policy(
483 |             self: @ComponentState<TContractState>,
484 |             public_key: felt252,
485 |             contract: ContractAddress
486 |         ) -> Option<Policy> {
487 |             PolicyInternalImpl::get_policy(self, public_key, contract)
488 |         }
489 |     }
490 | 
491 |     #[embeddable_as(SessionImpl)]
492 |     impl SessionInternalImpl<
493 |         TContractState,
494 |         +HasComponent<TContractState>
495 |     > of ISession<ComponentState<TContractState>> {
496 |         fn register_session(
497 |             ref self: ComponentState<TContractState>,
498 |             session: SessionData,
499 |             guid_or_address: felt252
500 |         ) {
501 |             let public_key = session.public_key;
502 |             assert(session.expires_at >= get_block_timestamp(), 'Session expired');
503 | 
504 |             self.sessions.entry(public_key).data.write(session);
505 |             self.sessions_vec.push(public_key);
506 |             self.valid_session_cache.entry((guid_or_address, public_key)).write(true);
507 |             self.emit(SessionRegistered { public_key, guid_or_address });
508 |         }
509 | 
510 |         fn revoke_session(
511 |             ref self: ComponentState<TContractState>,
512 |             public_key: felt252
513 |         ) {
514 |             let mut session_data = self.sessions.entry(public_key).data.read();
515 |             assert(!session_data.is_revoked, 'Session already revoked');
516 |             session_data.is_revoked = true;
517 |             self.sessions.entry(public_key).data.write(session_data);
518 |             self.emit(SessionRevoked { public_key });
519 |         }
520 | 
521 |         fn is_session_revoked(
522 |             self: @ComponentState<TContractState>,
523 |             public_key: felt252
524 |         ) -> bool {
525 |             let session_data = self.sessions.entry(public_key).data.read();
526 |             session_data.is_revoked
527 |         }
528 | 
529 |         fn is_session(
530 |             self: @ComponentState<TContractState>,
531 |             signature: Span<felt252>
532 |         ) -> bool {
533 |             match signature.get(0) {
534 |                 Option::Some(session_magic) => *session_magic.unbox() == 'session-token',
535 |                 Option::None => false
536 |             }
537 |         }
538 | 
539 |         fn is_session_registered(
540 |             self: @ComponentState<TContractState>,
541 |             public_key: felt252,
542 |             guid_or_address: felt252
543 |         ) -> bool {
544 |             if self.is_session_revoked(public_key) {
545 |                 return false;
546 |             }
547 |             self.valid_session_cache.entry((guid_or_address, public_key)).read()
548 |         }
549 | 
550 |         fn get_all_sessions(
551 |             self: @ComponentState<TContractState>
552 |         ) -> Array<felt252> {
553 |             let mut sessions: Array<felt252> = array![];
554 |             for i in 0..self.sessions_vec.len() {
555 |                 sessions.append(self.sessions_vec.at(i).read());
556 |             };
557 |             sessions
558 |         }
559 | 
560 |         fn get_session(
561 |             self: @ComponentState<TContractState>,
562 |             public_key: felt252
563 |         ) -> Option<SessionResult> {
564 |             let session_entry = self.sessions.entry(public_key);
565 |             let session_data = session_entry.data.read();
566 |             if session_data.public_key == 0 {
567 |                 Option::None
568 |             } else {
569 |                 let mut permissions = array![];
570 |                 for i in 0..session_entry.permissions_vec.len() {
571 |                     let contract = session_entry.permissions_vec.at(i).read();
572 |                     let permission = session_entry.permissions_map.entry(contract);
573 |                     let mut selectors = array![];
574 |                     for j in 0..permission.selector_count.read() {
575 |                         selectors.append(permission.selectors.entry(j).read());
576 |                     };
577 |                     permissions.append(PermissionResult {
578 |                         mode: permission.mode.read(),
579 |                         selectors: selectors,
580 |                         contract: contract,
581 |                     });
582 |                 };
583 |                 let mut policies = array![];
584 |                 for i in 0..session_entry.policies_vec.len() {
585 |                     let contract = session_entry.policies_vec.at(i).read();
586 |                     let policy = session_entry.policies_map.entry(contract);
587 |                     policies.append(PolicyResult {
588 |                         contract: contract,
589 |                         max_amount: policy.max_amount.read(),
590 |                         current_amount: policy.current_amount.read(),
591 |                     });
592 |                 };
593 |                 Option::Some(SessionResult {
594 |                     data: session_data,
595 |                     permissions: permissions,
596 |                     policies: policies,
597 |                 })
598 |             }
599 |         }
600 |     }
601 | 
602 |     #[embeddable_as(PermissionImpl)]
603 |     impl PermissionInternalImpl<
604 |         TContractState,
605 |         +HasComponent<TContractState>
606 |     > of IPermission<ComponentState<TContractState>> {
607 |         fn set_permission(
608 |             ref self: ComponentState<TContractState>,
609 |             public_key: felt252,
610 |             contract: ContractAddress,
611 |             mode: AccessMode,
612 |             selectors: Array<felt252>
613 |         ) {
614 |             let session_entry = self.sessions.entry(public_key);
615 |             let mut permission = session_entry.permissions_map.entry(contract);
616 |             permission.mode.write(mode);
617 | 
618 | 
619 |             let old_count = permission.selector_count.read();
620 |             let mut i = 0;
621 |             loop {
622 |                 if i >= old_count {
623 |                     break;
624 |                 }
625 |                 permission.selectors_map.entry(permission.selectors.entry(i).read()).write(false);
626 |                 permission.selectors.entry(i).write(0);
627 |                 i += 1;
628 |             };
629 | 
630 |             let mut new_count = 0;
631 |             let mut selectors = selectors;
632 |             loop {
633 |                 match selectors.pop_front() {
634 |                     Option::Some(selector) => {
635 |                         permission.selectors.entry(new_count).write(selector);
636 |                         permission.selectors_map.entry(selector).write(true);
637 |                         new_count += 1;
638 |                     },
639 |                     Option::None => { break; }
640 |                 };
641 |             };
642 |             permission.selector_count.write(new_count);
643 |             session_entry.permissions_vec.push(contract);
644 |             self.emit(PermissionUpdated { public_key, contract });
645 |         }
646 | 
647 |         fn check_permission(
648 |             self: @ComponentState<TContractState>,
649 |             public_key: felt252,
650 |             contract: ContractAddress,
651 |             selector: felt252
652 |         ) -> bool {
653 |             let session_entry = self.sessions.entry(public_key);
654 |             let permission = session_entry.permissions_map.entry(contract);
655 |             let mode = permission.mode.read();
656 |             let selector_exists = permission.selectors_map.entry(selector).read();
657 |             
658 |             match mode {
659 |                 AccessMode::Whitelist => selector_exists,
660 |                 AccessMode::Blacklist => !selector_exists,
661 |             }
662 |         }
663 | 
664 |         fn get_permission_details(
665 |             self: @ComponentState<TContractState>,
666 |             public_key: felt252,
667 |             contract: ContractAddress
668 |         ) -> PermissionResult {
669 |             let session_entry = self.sessions.entry(public_key);
670 |             let permission = session_entry.permissions_map.entry(contract);
671 |             let mode = permission.mode.read();
672 |             let count = permission.selector_count.read();
673 |             
674 |             let mut selectors = ArrayTrait::new();
675 |             let mut i = 0;
676 |             loop {
677 |                 if i >= count {
678 |                     break;
679 |                 }
680 |                 let selector = permission.selectors.entry(i).read();
681 |                 selectors.append(selector);
682 |                 i += 1;
683 |             };
684 |             
685 |             PermissionResult {
686 |                 mode: mode,
687 |                 selectors: selectors,
688 |                 contract: contract,
689 |             }
690 |         }
691 |     }
692 | 
693 |     #[embeddable_as(PolicyImpl)]
694 |     impl PolicyInternalImpl<
695 |         TContractState,
696 |         +HasComponent<TContractState>
697 |     > of IPolicy<ComponentState<TContractState>> {
698 |         fn set_policy(
699 |             ref self: ComponentState<TContractState>,
700 |             public_key: felt252,
701 |             contract: ContractAddress,
702 |             policy: Policy
703 |         ) {
704 |             let session_entry = self.sessions.entry(public_key);
705 |             let mut policy = policy;
706 |             session_entry.policies_map.entry(contract).write(policy);
707 |             self.emit(PolicyUpdated { public_key, contract });
708 |         }
709 | 
710 |         fn check_policy(
711 |             ref self: ComponentState<TContractState>,
712 |             public_key: felt252,
713 |             contract: ContractAddress,
714 |             amount: u256
715 |         ) -> bool {
716 |             let session_entry = self.sessions.entry(public_key);
717 |             let mut policy = session_entry.policies_map.entry(contract).read();
718 | 
719 |             // Check if new amount would exceed limit
720 |             let new_amount = policy.current_amount + amount;
721 |             if new_amount > policy.max_amount {
722 |                 return false;
723 |             }
724 | 
725 |             // Update policy state
726 |             policy.current_amount = new_amount;
727 |             session_entry.policies_map.entry(contract).write(policy);
728 |             session_entry.policies_vec.push(contract);
729 |             true
730 |         }
731 | 
732 |         fn get_policy(
733 |             self: @ComponentState<TContractState>,
734 |             public_key: felt252,
735 |             contract: ContractAddress
736 |         ) -> Option<Policy> {
737 |             let session_entry = self.sessions.entry(public_key);
738 |             let policy = session_entry.policies_map.entry(contract).read();
739 |             Option::Some(policy)
740 |         }
741 |     }
742 | 
743 |     //
744 |     // Internal
745 |     //
746 | 
747 |     #[generate_trait]
748 |     pub impl InternalImpl<
749 |         TContractState,
750 |         +HasComponent<TContractState>,
751 |         impl SRC5: SRC5Component::HasComponent<TContractState>,
752 |         +Drop<TContractState>,
753 |     > of InternalTrait<TContractState> {
754 |         /// Initializes the account with the given public key, and registers the ISRC6 interface ID.
755 |         ///
756 |         /// Emits an `OwnerAdded` event.
757 |         fn initializer(ref self: ComponentState<TContractState>, public_key: felt252) {
758 |             let mut src5_component = get_dep_component_mut!(ref self, SRC5);
759 |             src5_component.register_interface(interface::ISRC6_ID);
760 |             self._set_public_key(public_key);
761 |         }
762 | 
763 |         /// Validates that the caller is the account itself. Otherwise it reverts.
764 |         fn assert_only_self(self: @ComponentState<TContractState>) {
765 |             let caller = starknet::get_caller_address();
766 |             let self = starknet::get_contract_address();
767 |             assert(self == caller, Errors::UNAUTHORIZED);
768 |         }
769 | 
770 |         /// Validates that `new_owner` accepted the ownership of the contract.
771 |         ///
772 |         /// WARNING: This function assumes that `current_owner` is the current owner of the
773 |         /// contract, and does not validate this assumption.
774 |         ///
775 |         /// Requirements:
776 |         ///
777 |         /// - The signature must be valid for the new owner.
778 |         fn assert_valid_new_owner(
779 |             self: @ComponentState<TContractState>,
780 |             current_owner: felt252,
781 |             new_owner: felt252,
782 |             signature: Span<felt252>,
783 |         ) {
784 |             let message_hash = PoseidonTrait::new()
785 |                 .update_with('StarkNet Message')
786 |                 .update_with('accept_ownership')
787 |                 .update_with(starknet::get_contract_address())
788 |                 .update_with(current_owner)
789 |                 .finalize();
790 | 
791 |             let is_valid = is_valid_stark_signature(message_hash, new_owner, signature);
792 |             assert(is_valid, Errors::INVALID_SIGNATURE);
793 |         }
794 | 
795 |         /// Validates the signature for the current transaction.
796 |         /// Returns the short string `VALID` if valid, otherwise it reverts.
797 |         fn validate_transaction(self: @ComponentState<TContractState>) -> felt252 {
798 |             let tx_info = starknet::get_tx_info().unbox();
799 |             let tx_hash = tx_info.transaction_hash;
800 |             let signature = tx_info.signature;
801 |             assert(self._is_valid_signature(tx_hash, signature), Errors::INVALID_SIGNATURE);
802 |             starknet::VALIDATED
803 |         }
804 | 
805 |         /// Sets the public key without validating the caller.
806 |         /// The usage of this method outside the `set_public_key` function is discouraged.
807 |         ///
808 |         /// Emits an `OwnerAdded` event.
809 |         fn _set_public_key(ref self: ComponentState<TContractState>, new_public_key: felt252) {
810 |             self.Account_public_key.write(new_public_key);
811 |             self.emit(OwnerAdded { new_owner_guid: new_public_key });
812 |         }
813 | 
814 |         /// Returns whether the given signature is valid for the given hash
815 |         /// using the account's current public key.
816 |         fn _is_valid_signature(
817 |             self: @ComponentState<TContractState>, hash: felt252, signature: Span<felt252>,
818 |         ) -> bool {
819 |             let public_key = self.Account_public_key.read();
820 |             is_valid_stark_signature(hash, public_key, signature)
821 |         }
822 | 
823 |         fn validate_session_transaction(
824 |             ref self: ComponentState<TContractState>,
825 |             calls: Span<Call>,
826 |             mut signature: Span<felt252>,
827 |             transaction_hash: felt252,
828 |         ) -> felt252 {
829 |             assert_no_self_call(calls, get_contract_address());
830 |             // Verify signature format
831 |             assert(signature.len() >= 4, 'Invalid signature length');  // magic + pubkey + r + s
832 |             
833 |             // Extract signature components
834 |             let session_public_key = *signature[1];  // Keep public key in signature
835 |             let sig_r = *signature[2];
836 |             let sig_s = *signature[3];
837 | 
838 |             // Get transaction hash
839 |             // Get session data from storage using public key from signature
840 |             let session_entry = self.sessions.entry(session_public_key);
841 |             let session_data = session_entry.data.read();
842 |             
843 |             // Verify that the public key matches the stored session
844 |             assert(session_data.public_key == session_public_key, 'Invalid session key');
845 | 
846 |             // Check session validity last
847 |             assert(!self.is_session_revoked(session_data.public_key), 'Session already revoked');
848 |             
849 |             // Verify signature
850 |             assert(
851 |                 ecdsa::check_ecdsa_signature(
852 |                     message_hash: transaction_hash,
853 |                     public_key: session_public_key,
854 |                     signature_r: sig_r,
855 |                     signature_s: sig_s
856 |                 ),
857 |                 'Invalid session signature'
858 |             );
859 | 
860 |             let mut calls = calls;
861 |             loop {
862 |                 match calls.pop_front() {
863 |                     Option::Some(call) => {
864 |                         assert(
865 |                             self.check_permission(
866 |                                 session_data.public_key, *call.to, *call.selector
867 |                             ),
868 |                             Errors::INVALID_SELECTOR
869 |                         );
870 |             
871 |                         if (*call).calldata.len() >= 3 {
872 |                             let amount_low: u128 = (*call.calldata[1]).try_into().unwrap();
873 |                             let amount_high: u128 = (*call.calldata[2]).try_into().unwrap();
874 |                             let amount = u256 { low: amount_low, high: amount_high };
875 |                             assert(
876 |                                 self.check_policy(session_data.public_key, *call.to, amount),
877 |                                 'Policy check failed'
878 |                             );
879 |                         }
880 |                     },
881 |                     Option::None => { break; }
882 |                 };
883 |             };
884 | 
885 |             VALIDATED
886 |         }
887 |     }
888 | }
889 | 


--------------------------------------------------------------------------------
/contracts/src/interfaces/IInfiniRewards.cairo:
--------------------------------------------------------------------------------
 1 | 
 2 | /// @notice Contains constants representing various game error messages
 3 | pub mod Errors {
 4 |     pub const COLLECTIBLE_EXPIRED: felt252 = 'COLLECTIBLE EXPIRED';
 5 |     pub const INSUFFICIENT_BALANCE: felt252 = 'INSUFFICIENT BALANCE';
 6 |     pub const COLLECTIBLE_NOT_EXIST: felt252 = 'COLLECTIBLE NOT EXIST';
 7 |     pub const INVALID_PRICE: felt252 = 'INVALID PRICE';
 8 |     pub const INVALID_AMOUNT: felt252 = 'INVALID AMOUNT';
 9 |     pub const NOT_FOR_SALE: felt252 = 'NOT FOR SALE';
10 | }


--------------------------------------------------------------------------------
/contracts/src/interfaces/IInfiniRewardsMerchantAccount.cairo:
--------------------------------------------------------------------------------
 1 | // SPDX-License-Identifier: MIT
 2 | 
 3 | use starknet::ContractAddress;
 4 | 
 5 | /// @title IInfiniRewardsMerchantAccount Interface
 6 | /// @notice Interface for interacting with InfiniRewardsMerchantAccount contract
 7 | 
 8 | #[starknet::interface]
 9 | pub trait IInfiniRewardsMerchantAccount<TContractState> {
10 |     /// @notice Adds a points contract to the merchant account
11 |     /// @param points_contract The address of the points contract to add
12 |     fn add_points_contract(ref self: TContractState, points_contract: ContractAddress);
13 | 
14 |     /// @notice Adds a collectible contract to the merchant account
15 |     /// @param collectible_contract The address of the collectible contract to add
16 |     fn add_collectible_contract(ref self: TContractState, collectible_contract: ContractAddress);
17 | 
18 |     /// @notice Sets the metadata for the merchant account
19 |     /// @param metadata The metadata to set
20 |     fn set_metadata(ref self: TContractState, metadata: ByteArray);
21 |     
22 | }


--------------------------------------------------------------------------------
/contracts/src/interfaces/IInfiniRewardsPoints.cairo:
--------------------------------------------------------------------------------
1 | use starknet::ContractAddress;
2 | 
3 | #[starknet::interface]
4 | pub trait IInfiniRewardsPoints<TContractState> {
5 |     fn burn(ref self: TContractState, account: ContractAddress, amount: u256) -> bool;
6 | }
7 | 


--------------------------------------------------------------------------------
/contracts/src/interfaces/IInfiniRewardsUserAccount.cairo:
--------------------------------------------------------------------------------
 1 | // SPDX-License-Identifier: MIT
 2 | 
 3 | /// @title IInfiniRewardsMerchantAccount Interface
 4 | /// @notice Interface for interacting with InfiniRewardsMerchantAccount contract
 5 | 
 6 | #[starknet::interface]
 7 | pub trait IInfiniRewardsUserAccount<TContractState> {
 8 |     /// @notice Sets the metadata for the user account
 9 |     /// @param metadata The metadata to set
10 |     fn set_metadata(ref self: TContractState, metadata: ByteArray);
11 | 
12 | }


--------------------------------------------------------------------------------
/contracts/src/interfaces/permission.cairo:
--------------------------------------------------------------------------------
 1 | // SPDX-License-Identifier: MIT
 2 | use starknet::ContractAddress;
 3 | use starknet::storage::Map;
 4 | #[derive(Copy, Drop, Serde, PartialEq, starknet::Store)]
 5 | pub enum AccessMode {
 6 |     Whitelist,
 7 |     #[default]
 8 |     Blacklist
 9 | }
10 | 
11 | #[starknet::storage_node]
12 | pub struct Permission{
13 |     pub mode: AccessMode,
14 |     pub selectors: Map<u32, felt252>,
15 |     pub selectors_map: Map<felt252, bool>,
16 |     pub selector_count: u32,
17 | }
18 | 
19 | #[derive(Drop, Serde)]
20 | pub struct PermissionResult {
21 |     pub mode: AccessMode,
22 |     pub contract: ContractAddress,
23 |     pub selectors: Array<felt252>,
24 | }
25 | 
26 | #[starknet::interface]
27 | pub trait IPermission<TContractState> {
28 |     fn set_permission(
29 |         ref self: TContractState,
30 |         public_key: felt252,
31 |         contract: ContractAddress,
32 |         mode: AccessMode,
33 |         selectors: Array<felt252>
34 |     );
35 | 
36 |     fn check_permission(
37 |         self: @TContractState,
38 |         public_key: felt252,
39 |         contract: ContractAddress,
40 |         selector: felt252
41 |     ) -> bool;
42 | 
43 |     fn get_permission_details(
44 |         self: @TContractState,
45 |         public_key: felt252,
46 |         contract: ContractAddress
47 |     ) -> PermissionResult;
48 | }
49 | 


--------------------------------------------------------------------------------
/contracts/src/interfaces/policy.cairo:
--------------------------------------------------------------------------------
 1 | // SPDX-License-Identifier: MIT
 2 | use starknet::ContractAddress;
 3 | 
 4 | #[derive(Copy, Drop, Serde, starknet::Store)]
 5 | pub struct Policy {
 6 |     pub max_amount: u256,
 7 |     pub current_amount: u256,
 8 | }
 9 | 
10 | #[derive(Drop, Serde)]
11 | pub struct PolicyResult {
12 |     pub contract: ContractAddress,
13 |     pub max_amount: u256,
14 |     pub current_amount: u256,
15 | }
16 | 
17 | #[starknet::interface]
18 | pub trait IPolicy<TContractState> {
19 |     fn set_policy(
20 |         ref self: TContractState,
21 |         public_key: felt252,
22 |         contract: ContractAddress,
23 |         policy: Policy
24 |     );
25 | 
26 |     fn check_policy(
27 |         ref self: TContractState,
28 |         public_key: felt252,
29 |         contract: ContractAddress,
30 |         amount: u256,
31 |     ) -> bool;
32 | 
33 |     fn get_policy(
34 |         self: @TContractState,
35 |         public_key: felt252,
36 |         contract: ContractAddress
37 |     ) -> Option<Policy>;
38 | }


--------------------------------------------------------------------------------
/contracts/src/interfaces/session_key.cairo:
--------------------------------------------------------------------------------
 1 | // SPDX-License-Identifier: MIT
 2 | use contracts::interfaces::permission::{Permission, PermissionResult};
 3 | use contracts::interfaces::policy::{Policy, PolicyResult};
 4 | use starknet::storage::{Map, Vec};
 5 | use starknet::ContractAddress;
 6 | 
 7 | #[starknet::storage_node]
 8 | pub struct Session {
 9 |     pub data: SessionData,
10 |     pub permissions_map: Map<ContractAddress, Permission>,
11 |     pub permissions_vec: Vec<ContractAddress>,
12 |     pub policies_map: Map<ContractAddress, Policy>,
13 |     pub policies_vec: Vec<ContractAddress>,
14 | }
15 | 
16 | #[derive(Drop, Serde, starknet::Store)]
17 | pub struct SessionData {
18 |     pub public_key: felt252,
19 |     pub expires_at: u64,
20 |     pub metadata: ByteArray,
21 |     pub is_revoked: bool,
22 | }
23 | 
24 | #[derive(Drop, Serde)]
25 | pub struct SessionResult {
26 |     pub data: SessionData,
27 |     pub permissions: Array<PermissionResult>,
28 |     pub policies: Array<PolicyResult>,
29 | }
30 | 
31 | #[starknet::interface]
32 | pub trait ISession<TContractState> {
33 |     fn register_session(
34 |         ref self: TContractState,
35 |         session: SessionData,
36 |         guid_or_address: felt252
37 |     );
38 |     
39 |     fn revoke_session(
40 |         ref self: TContractState,
41 |         public_key: felt252
42 |     );
43 | 
44 |     fn is_session(
45 |         self: @TContractState,
46 |         signature: Span<felt252>
47 |     ) -> bool;
48 |     
49 |     fn is_session_revoked(
50 |         self: @TContractState,
51 |         public_key: felt252
52 |     ) -> bool;
53 |     
54 |     fn is_session_registered(
55 |         self: @TContractState,
56 |         public_key: felt252,
57 |         guid_or_address: felt252
58 |     ) -> bool;
59 | 
60 |     fn get_all_sessions(
61 |         self: @TContractState
62 |     ) -> Array<felt252>;
63 |     
64 |     fn get_session(
65 |         self: @TContractState,
66 |         public_key: felt252
67 |     ) -> Option<SessionResult>;
68 | }
69 | 


--------------------------------------------------------------------------------
/contracts/src/lib.cairo:
--------------------------------------------------------------------------------
 1 | mod InfiniRewardsUserAccount;
 2 | mod InfiniRewardsMerchantAccount;
 3 | mod InfiniRewardsFactory;
 4 | mod InfiniRewardsPoints;
 5 | mod InfiniRewardsCollectible;
 6 | mod interfaces {
 7 |     pub mod IInfiniRewards;
 8 |     pub mod IInfiniRewardsPoints;
 9 |     pub mod IInfiniRewardsMerchantAccount;
10 |     pub mod IInfiniRewardsUserAccount;
11 |     pub mod permission;
12 |     pub mod policy;
13 |     pub mod session_key;
14 | }
15 | 
16 | pub mod components {
17 |     pub mod account;
18 | }
19 | 
20 | pub mod utils {
21 |     pub mod asserts;
22 | }


--------------------------------------------------------------------------------
/contracts/src/utils/asserts.cairo:
--------------------------------------------------------------------------------
 1 | const DECLARE_SELECTOR: felt252 = selector!("__declare_transaction__");
 2 | 
 3 | use starknet::{ContractAddress, account::Call};
 4 | 
 5 | pub fn assert_no_self_call(mut calls: Span<Call>, self: ContractAddress) {
 6 |     while let Option::Some(call) = calls
 7 |         .pop_front() {
 8 |             if *call.selector != DECLARE_SELECTOR {
 9 |                 assert(*call.to != self, 'argent/no-multicall-to-self')
10 |             }
11 |         }
12 | }
13 |  


--------------------------------------------------------------------------------