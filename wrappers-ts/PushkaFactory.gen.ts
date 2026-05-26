// AUTO-GENERATED, do not edit
// It's a TypeScript wrapper for a PushkaFactory contract in Tolk.
/* eslint-disable */

import * as c from '@ton/core';
import { beginCell, ContractProvider, Sender, SendMode } from '@ton/core';

// ————————————————————————————————————————————
//   predefined types and functions
//

type StoreCallback<T> = (obj: T, b: c.Builder) => void
type LoadCallback<T> = (s: c.Slice) => T

export type CellRef<T> = {
    ref: T
}

function makeCellFrom<T>(self: T, storeFn_T: StoreCallback<T>): c.Cell {
    let b = beginCell();
    storeFn_T(self, b);
    return b.endCell();
}

function loadAndCheckPrefix32(s: c.Slice, expected: number, structName: string): void {
    let prefix = s.loadUint(32);
    if (prefix !== expected) {
        throw new Error(`Incorrect prefix for '${structName}': expected 0x${expected.toString(16).padStart(8, '0')}, got 0x${prefix.toString(16).padStart(8, '0')}`);
    }
}

function lookupPrefix(s: c.Slice, expected: number, prefixLen: number): boolean {
    return s.remainingBits >= prefixLen && s.preloadUint(prefixLen) === expected;
}

function throwNonePrefixMatch(fieldPath: string): never {
    throw new Error(`Incorrect prefix for '${fieldPath}': none of variants matched`);
}

function storeCellRef<T>(cell: CellRef<T>, b: c.Builder, storeFn_T: StoreCallback<T>): void {
    let b_ref = c.beginCell();
    storeFn_T(cell.ref, b_ref);
    b.storeRef(b_ref.endCell());
}

function loadCellRef<T>(s: c.Slice, loadFn_T: LoadCallback<T>): CellRef<T> {
    let s_ref = s.loadRef().beginParse();
    return { ref: loadFn_T(s_ref) };
}

function storeTolkNullable<T>(v: T | null, b: c.Builder, storeFn_T: StoreCallback<T>): void {
    if (v === null) {
        b.storeUint(0, 1);
    } else {
        b.storeUint(1, 1);
        storeFn_T(v, b);
    }
}

// ————————————————————————————————————————————
//   parse get methods result from a TVM stack
//

class StackReader {
    constructor(private tuple: c.TupleItem[]) {
    }

    static fromGetMethod(expectedN: number, getMethodResult: { stack: c.TupleReader }): StackReader {
        let tuple = [] as c.TupleItem[];
        while (getMethodResult.stack.remaining) {
            tuple.push(getMethodResult.stack.pop());
        }
        if (tuple.length !== expectedN) {
            throw new Error(`expected ${expectedN} stack width, got ${tuple.length}`);
        }
        return new StackReader(tuple);
    }

    private popExpecting<ItemT>(itemType: string): ItemT {
        const item = this.tuple.shift();
        if (item?.type === itemType) {
            return item as ItemT;
        }
        throw new Error(`not '${itemType}' on a stack`);
    }

    private popCellLike(): c.Cell {
        const item = this.tuple.shift();
        if (item && (item.type === 'cell' || item.type === 'slice' || item.type === 'builder')) {
            return item.cell;
        }
        throw new Error(`not cell/slice on a stack`);
    }

    readBigInt(): bigint {
        return this.popExpecting<c.TupleItemInt>('int').value;
    }

    readBoolean(): boolean {
        return this.popExpecting<c.TupleItemInt>('int').value !== 0n;
    }

    readCell(): c.Cell {
        return this.popCellLike();
    }

    readSlice(): c.Slice {
        return this.popCellLike().beginParse();
    }
}

// ————————————————————————————————————————————
//   auto-generated serializers to/from cells
//

type coins = bigint

type uint16 = bigint
type uint32 = bigint
type uint64 = bigint

/**
 > struct FactoryStorage {
 >     owner: address
 >     feeBps: uint16
 >     nextDealId: uint64
 >     accumulatedFees: coins
 >     escrowCode: cell
 > }
 */
export interface FactoryStorage {
    readonly $: 'FactoryStorage'
    owner: c.Address
    feeBps: uint16
    nextDealId: uint64
    accumulatedFees: coins
    escrowCode: c.Cell
}

export const FactoryStorage = {
    create(args: {
        owner: c.Address
        feeBps: uint16
        nextDealId: uint64
        accumulatedFees: coins
        escrowCode: c.Cell
    }): FactoryStorage {
        return {
            $: 'FactoryStorage',
            ...args
        }
    },
    fromSlice(s: c.Slice): FactoryStorage {
        return {
            $: 'FactoryStorage',
            owner: s.loadAddress(),
            feeBps: s.loadUintBig(16),
            nextDealId: s.loadUintBig(64),
            accumulatedFees: s.loadCoins(),
            escrowCode: s.loadRef(),
        }
    },
    store(self: FactoryStorage, b: c.Builder): void {
        b.storeAddress(self.owner);
        b.storeUint(self.feeBps, 16);
        b.storeUint(self.nextDealId, 64);
        b.storeCoins(self.accumulatedFees);
        b.storeRef(self.escrowCode);
    },
    toCell(self: FactoryStorage): c.Cell {
        return makeCellFrom<FactoryStorage>(self, FactoryStorage.store);
    }
}

/**
 > struct (0x70757300) CreateDeal {
 >     takerPinned: address?
 >     giveAmount: coins
 >     wantAmount: coins
 >     deadline: uint32
 > }
 */
export interface CreateDeal {
    readonly $: 'CreateDeal'
    takerPinned: c.Address | null
    giveAmount: coins
    wantAmount: coins
    deadline: uint32
}

export const CreateDeal = {
    PREFIX: 0x70757300,

    create(args: {
        takerPinned: c.Address | null
        giveAmount: coins
        wantAmount: coins
        deadline: uint32
    }): CreateDeal {
        return {
            $: 'CreateDeal',
            ...args
        }
    },
    fromSlice(s: c.Slice): CreateDeal {
        loadAndCheckPrefix32(s, 0x70757300, 'CreateDeal');
        return {
            $: 'CreateDeal',
            takerPinned: s.loadMaybeAddress(),
            giveAmount: s.loadCoins(),
            wantAmount: s.loadCoins(),
            deadline: s.loadUintBig(32),
        }
    },
    store(self: CreateDeal, b: c.Builder): void {
        b.storeUint(0x70757300, 32);
        b.storeAddress(self.takerPinned);
        b.storeCoins(self.giveAmount);
        b.storeCoins(self.wantAmount);
        b.storeUint(self.deadline, 32);
    },
    toCell(self: CreateDeal): c.Cell {
        return makeCellFrom<CreateDeal>(self, CreateDeal.store);
    }
}

/**
 > struct (0x70757301) FeePayout {
 >     dealId: uint64
 > }
 */
export interface FeePayout {
    readonly $: 'FeePayout'
    dealId: uint64
}

export const FeePayout = {
    PREFIX: 0x70757301,

    create(args: {
        dealId: uint64
    }): FeePayout {
        return {
            $: 'FeePayout',
            ...args
        }
    },
    fromSlice(s: c.Slice): FeePayout {
        loadAndCheckPrefix32(s, 0x70757301, 'FeePayout');
        return {
            $: 'FeePayout',
            dealId: s.loadUintBig(64),
        }
    },
    store(self: FeePayout, b: c.Builder): void {
        b.storeUint(0x70757301, 32);
        b.storeUint(self.dealId, 64);
    },
    toCell(self: FeePayout): c.Cell {
        return makeCellFrom<FeePayout>(self, FeePayout.store);
    }
}

/**
 > struct (0x70757302) WithdrawFees {
 >     amount: coins
 > }
 */
export interface WithdrawFees {
    readonly $: 'WithdrawFees'
    amount: coins
}

export const WithdrawFees = {
    PREFIX: 0x70757302,

    create(args: {
        amount: coins
    }): WithdrawFees {
        return {
            $: 'WithdrawFees',
            ...args
        }
    },
    fromSlice(s: c.Slice): WithdrawFees {
        loadAndCheckPrefix32(s, 0x70757302, 'WithdrawFees');
        return {
            $: 'WithdrawFees',
            amount: s.loadCoins(),
        }
    },
    store(self: WithdrawFees, b: c.Builder): void {
        b.storeUint(0x70757302, 32);
        b.storeCoins(self.amount);
    },
    toCell(self: WithdrawFees): c.Cell {
        return makeCellFrom<WithdrawFees>(self, WithdrawFees.store);
    }
}

/**
 > struct (0x70757303) SetFeeBps {
 >     feeBps: uint16
 > }
 */
export interface SetFeeBps {
    readonly $: 'SetFeeBps'
    feeBps: uint16
}

export const SetFeeBps = {
    PREFIX: 0x70757303,

    create(args: {
        feeBps: uint16
    }): SetFeeBps {
        return {
            $: 'SetFeeBps',
            ...args
        }
    },
    fromSlice(s: c.Slice): SetFeeBps {
        loadAndCheckPrefix32(s, 0x70757303, 'SetFeeBps');
        return {
            $: 'SetFeeBps',
            feeBps: s.loadUintBig(16),
        }
    },
    store(self: SetFeeBps, b: c.Builder): void {
        b.storeUint(0x70757303, 32);
        b.storeUint(self.feeBps, 16);
    },
    toCell(self: SetFeeBps): c.Cell {
        return makeCellFrom<SetFeeBps>(self, SetFeeBps.store);
    }
}

/**
 > struct (0x70757304) SetOwner {
 >     newOwner: address
 > }
 */
export interface SetOwner {
    readonly $: 'SetOwner'
    newOwner: c.Address
}

export const SetOwner = {
    PREFIX: 0x70757304,

    create(args: {
        newOwner: c.Address
    }): SetOwner {
        return {
            $: 'SetOwner',
            ...args
        }
    },
    fromSlice(s: c.Slice): SetOwner {
        loadAndCheckPrefix32(s, 0x70757304, 'SetOwner');
        return {
            $: 'SetOwner',
            newOwner: s.loadAddress(),
        }
    },
    store(self: SetOwner, b: c.Builder): void {
        b.storeUint(0x70757304, 32);
        b.storeAddress(self.newOwner);
    },
    toCell(self: SetOwner): c.Cell {
        return makeCellFrom<SetOwner>(self, SetOwner.store);
    }
}

/**
 > struct (0x70757305) SetEscrowCode {
 >     code: cell
 > }
 */
export interface SetEscrowCode {
    readonly $: 'SetEscrowCode'
    code: c.Cell
}

export const SetEscrowCode = {
    PREFIX: 0x70757305,

    create(args: {
        code: c.Cell
    }): SetEscrowCode {
        return {
            $: 'SetEscrowCode',
            ...args
        }
    },
    fromSlice(s: c.Slice): SetEscrowCode {
        loadAndCheckPrefix32(s, 0x70757305, 'SetEscrowCode');
        return {
            $: 'SetEscrowCode',
            code: s.loadRef(),
        }
    },
    store(self: SetEscrowCode, b: c.Builder): void {
        b.storeUint(0x70757305, 32);
        b.storeRef(self.code);
    },
    toCell(self: SetEscrowCode): c.Cell {
        return makeCellFrom<SetEscrowCode>(self, SetEscrowCode.store);
    }
}

// ————————————————————————————————————————————
//    class PushkaFactory
//

interface ExtraSendOptions {
    bounce?: boolean                    // default: false
    sendMode?: SendMode                 // default: SendMode.PAY_GAS_SEPARATELY
    extraCurrencies?: c.ExtraCurrency   // default: empty dict
}

interface DeployedAddrOptions {
    workchain?: number                  // default: 0 (basechain)
    toShard?: { fixedPrefixLength: number; closeTo: c.Address }
    overrideContractCode?: c.Cell
}

function calculateDeployedAddress(code: c.Cell, data: c.Cell, options: DeployedAddrOptions): c.Address {
    const stateInitCell = beginCell().store(c.storeStateInit({
        code,
        data,
        splitDepth: options.toShard?.fixedPrefixLength,
        special: null,
        libraries: null,
    })).endCell();

    let addrHash = stateInitCell.hash();
    if (options.toShard) {
        const shardDepth = options.toShard.fixedPrefixLength;
        addrHash = beginCell()
            .storeBits(new c.BitString(options.toShard.closeTo.hash, 0, shardDepth))
            .storeBits(new c.BitString(stateInitCell.hash(), shardDepth, 256 - shardDepth))
            .endCell()
            .beginParse().loadBuffer(32);
    }

    return new c.Address(options.workchain ?? 0, addrHash);
}

export class PushkaFactory implements c.Contract {
    static CodeCell = c.Cell.fromBase64('te6ccgECFAEAApcAART/APSkE/S88sgLAQIBYgIDBOzQ+JGRMOAg1ywjg6uYBOMC1ywjg6uYDI4bW+1E0PpI1k/6APiXEqADyPpSEs5Y+gLOye1U4NcsI4OrmBTjAtcsI4OrmByOJTHtRND6SNMPMfiSIscF8uBkAtcLDyDBZfLgyAHI+lLLD87J7VTg1ywjg6uYJOMCBAUGBwIBIAoLAfwx7UTQAfpQ+gD6ANcLHyLCAPLhMyHCAPLhMyD4I7zy4S4iggr68ICgggkxLQCg+Je78uEtBPpI0w/TPyDXTFNj+Cj4kgvI+lRQA/oCUAj6AhrLHxbLD8kiB4IK+vCAoAnI+lIXyz8X+lLPhAYVzMnIz4mIAVMUyM+E0MzM+RYIAI4x7UTQ+kjWT/oA+JIkxwXy4GQhwgDy4MkE+gAwUwHjBFMBu/LgyWahI8j6UhPOWPoCE87J7VTIz4UI+lIB+gJwzwtqyXH7AAAyMe1E0PpI+JJYxwXy4GQB+kgwyPpSzsntVAFgidcnjiIx7UTQ+kjWT/oAMPiSI8cF8uBkA9dMAsj6Us5Y+gLMye1U4DCEDwHHAPL0CQBIzwv/UAf6AoEAjM8LcBPMFczJcfsAAaQDyPpSyw8Syz/Oye1UAAhwdXMFAgEgDA0AH76DV2omh9JGmH6Z/9AGpowCASAODwAnuFHe1E0PpI0w8x0z8x+gAx1DHRgCASAQEQAntxC9qJofSQY6Yfpn5j9ABjqGOjAAJ7Fb+1E0PpIMdMPMdM/MfoA1DHRgAgOWkBITAH+yHaiaH0kGOmH66Z8FANkfSooAv0BKAH9AWWP5YfkgWR9KQpln4l9KWfCA2ZkgORnwmhmZnyLZGfFACBl/+eoQACWzfaiaH0kGOmHmOmf/QAY6hjow');

    static Errors = {
        'Errors.Unauthorized': 100,
        'Errors.FeeBpsTooHigh': 200,
        'Errors.NothingToWithdraw': 201,
        'Errors.Underfunded': 301,
        'Errors.DeadlinePassed': 302,
        'Errors.ZeroAmount': 307,
        'Errors.InvalidMessage': 65535,
    }

    readonly address: c.Address
    readonly init: { code: c.Cell, data: c.Cell } | undefined

    protected constructor(address: c.Address, init?: { code: c.Cell, data: c.Cell }) {
        this.address = address;
        this.init = init;
    }

    static fromAddress(address: c.Address) {
        return new PushkaFactory(address);
    }

    static fromStorage(emptyStorage: {
        owner: c.Address
        feeBps: uint16
        nextDealId: uint64
        accumulatedFees: coins
        escrowCode: c.Cell
    }, deployedOptions?: DeployedAddrOptions) {
        const initialState = {
            code: deployedOptions?.overrideContractCode ?? PushkaFactory.CodeCell,
            data: FactoryStorage.toCell(FactoryStorage.create(emptyStorage)),
        };
        const address = calculateDeployedAddress(initialState.code, initialState.data, deployedOptions ?? {});
        return new PushkaFactory(address, initialState);
    }

    static createCellOfCreateDeal(body: {
        takerPinned: c.Address | null
        giveAmount: coins
        wantAmount: coins
        deadline: uint32
    }) {
        return CreateDeal.toCell(CreateDeal.create(body));
    }

    static createCellOfFeePayout(body: {
        dealId: uint64
    }) {
        return FeePayout.toCell(FeePayout.create(body));
    }

    static createCellOfWithdrawFees(body: {
        amount: coins
    }) {
        return WithdrawFees.toCell(WithdrawFees.create(body));
    }

    static createCellOfSetFeeBps(body: {
        feeBps: uint16
    }) {
        return SetFeeBps.toCell(SetFeeBps.create(body));
    }

    static createCellOfSetOwner(body: {
        newOwner: c.Address
    }) {
        return SetOwner.toCell(SetOwner.create(body));
    }

    static createCellOfSetEscrowCode(body: {
        code: c.Cell
    }) {
        return SetEscrowCode.toCell(SetEscrowCode.create(body));
    }

    async sendDeploy(provider: ContractProvider, via: Sender, msgValue: coins, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: c.Cell.EMPTY,
            ...extraOptions
        });
    }

    async sendCreateDeal(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        takerPinned: c.Address | null
        giveAmount: coins
        wantAmount: coins
        deadline: uint32
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: CreateDeal.toCell(CreateDeal.create(body)),
            ...extraOptions
        });
    }

    async sendFeePayout(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        dealId: uint64
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: FeePayout.toCell(FeePayout.create(body)),
            ...extraOptions
        });
    }

    async sendWithdrawFees(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        amount: coins
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: WithdrawFees.toCell(WithdrawFees.create(body)),
            ...extraOptions
        });
    }

    async sendSetFeeBps(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        feeBps: uint16
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: SetFeeBps.toCell(SetFeeBps.create(body)),
            ...extraOptions
        });
    }

    async sendSetOwner(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        newOwner: c.Address
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: SetOwner.toCell(SetOwner.create(body)),
            ...extraOptions
        });
    }

    async sendSetEscrowCode(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        code: c.Cell
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: SetEscrowCode.toCell(SetEscrowCode.create(body)),
            ...extraOptions
        });
    }

    async getDetails(provider: ContractProvider): Promise<FactoryStorage> {
        const r = StackReader.fromGetMethod(5, await provider.get('details', []));
        return ({
            $: 'FactoryStorage',
            owner: r.readSlice().loadAddress(),
            feeBps: r.readBigInt(),
            nextDealId: r.readBigInt(),
            accumulatedFees: r.readBigInt(),
            escrowCode: r.readCell(),
        });
    }

    async getOwner(provider: ContractProvider): Promise<c.Address> {
        const r = StackReader.fromGetMethod(1, await provider.get('owner', []));
        return r.readSlice().loadAddress();
    }

    async getFeeBps(provider: ContractProvider): Promise<uint16> {
        const r = StackReader.fromGetMethod(1, await provider.get('feeBps', []));
        return r.readBigInt();
    }

    async getNextDealId(provider: ContractProvider): Promise<uint64> {
        const r = StackReader.fromGetMethod(1, await provider.get('nextDealId', []));
        return r.readBigInt();
    }

    async getAccumulatedFees(provider: ContractProvider): Promise<coins> {
        const r = StackReader.fromGetMethod(1, await provider.get('accumulatedFees', []));
        return r.readBigInt();
    }

    async getEscrowAddressOf(provider: ContractProvider, dealId: uint64, maker: c.Address, takerPinned: c.Address | null, giveAmount: coins, wantAmount: coins, deadline: uint32): Promise<c.Address> {
        const r = StackReader.fromGetMethod(1, await provider.get('escrowAddressOf', [
            { type: 'int', value: dealId },
            { type: 'slice', cell: makeCellFrom<c.Address>(maker,
                (v,b) => b.storeAddress(v)
            ) },
            takerPinned === null ? { type: 'null' } : { type: 'slice', cell: makeCellFrom<c.Address | null>(takerPinned,
                (v,b) => b.storeAddress(v)
            ) },
            { type: 'int', value: giveAmount },
            { type: 'int', value: wantAmount },
            { type: 'int', value: deadline },
        ]));
        return r.readSlice().loadAddress();
    }
}
