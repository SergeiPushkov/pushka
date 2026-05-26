// AUTO-GENERATED, do not edit
// It's a TypeScript wrapper for a PushkaEscrow contract in Tolk.
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

    readNullable<T>(readFn_T: (r: StackReader) => T): T | null {
        if (this.tuple[0].type === 'null') {
            this.tuple.shift();
            return null;
        }
        return readFn_T(this);
    }

    readCellRef<T>(loadFn_T: LoadCallback<T>): CellRef<T> {
        return { ref: loadFn_T(this.readCell().beginParse()) };
    }
}

// ————————————————————————————————————————————
//   auto-generated serializers to/from cells
//

type coins = bigint

type uint8 = bigint
type uint16 = bigint
type uint32 = bigint
type uint64 = bigint

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
 > struct EscrowTerms {
 >     takerPinned: address?
 >     giveAmount: coins
 >     wantAmount: coins
 >     deadline: uint32
 >     feeBps: uint16
 > }
 */
export interface EscrowTerms {
    readonly $: 'EscrowTerms'
    takerPinned: c.Address | null
    giveAmount: coins
    wantAmount: coins
    deadline: uint32
    feeBps: uint16
}

export const EscrowTerms = {
    create(args: {
        takerPinned: c.Address | null
        giveAmount: coins
        wantAmount: coins
        deadline: uint32
        feeBps: uint16
    }): EscrowTerms {
        return {
            $: 'EscrowTerms',
            ...args
        }
    },
    fromSlice(s: c.Slice): EscrowTerms {
        return {
            $: 'EscrowTerms',
            takerPinned: s.loadMaybeAddress(),
            giveAmount: s.loadCoins(),
            wantAmount: s.loadCoins(),
            deadline: s.loadUintBig(32),
            feeBps: s.loadUintBig(16),
        }
    },
    store(self: EscrowTerms, b: c.Builder): void {
        b.storeAddress(self.takerPinned);
        b.storeCoins(self.giveAmount);
        b.storeCoins(self.wantAmount);
        b.storeUint(self.deadline, 32);
        b.storeUint(self.feeBps, 16);
    },
    toCell(self: EscrowTerms): c.Cell {
        return makeCellFrom<EscrowTerms>(self, EscrowTerms.store);
    }
}

/**
 > struct EscrowStorage {
 >     factory: address
 >     dealId: uint64
 >     maker: address
 >     state: uint8
 >     terms: Cell<EscrowTerms>
 > }
 */
export interface EscrowStorage {
    readonly $: 'EscrowStorage'
    factory: c.Address
    dealId: uint64
    maker: c.Address
    state: uint8
    terms: CellRef<EscrowTerms>
}

export const EscrowStorage = {
    create(args: {
        factory: c.Address
        dealId: uint64
        maker: c.Address
        state: uint8
        terms: CellRef<EscrowTerms>
    }): EscrowStorage {
        return {
            $: 'EscrowStorage',
            ...args
        }
    },
    fromSlice(s: c.Slice): EscrowStorage {
        return {
            $: 'EscrowStorage',
            factory: s.loadAddress(),
            dealId: s.loadUintBig(64),
            maker: s.loadAddress(),
            state: s.loadUintBig(8),
            terms: loadCellRef<EscrowTerms>(s, EscrowTerms.fromSlice),
        }
    },
    store(self: EscrowStorage, b: c.Builder): void {
        b.storeAddress(self.factory);
        b.storeUint(self.dealId, 64);
        b.storeAddress(self.maker);
        b.storeUint(self.state, 8);
        storeCellRef<EscrowTerms>(self.terms, b, EscrowTerms.store);
    },
    toCell(self: EscrowStorage): c.Cell {
        return makeCellFrom<EscrowStorage>(self, EscrowStorage.store);
    }
}

/**
 > struct (0x70757311) Accept {
 > }
 */
export interface Accept {
    readonly $: 'Accept'
}

export const Accept = {
    PREFIX: 0x70757311,

    create(): Accept {
        return {
            $: 'Accept',
        }
    },
    fromSlice(s: c.Slice): Accept {
        loadAndCheckPrefix32(s, 0x70757311, 'Accept');
        return {
            $: 'Accept',
        }
    },
    store(self: Accept, b: c.Builder): void {
        b.storeUint(0x70757311, 32);
    },
    toCell(self: Accept): c.Cell {
        return makeCellFrom<Accept>(self, Accept.store);
    }
}

/**
 > struct (0x70757312) Cancel {
 > }
 */
export interface Cancel {
    readonly $: 'Cancel'
}

export const Cancel = {
    PREFIX: 0x70757312,

    create(): Cancel {
        return {
            $: 'Cancel',
        }
    },
    fromSlice(s: c.Slice): Cancel {
        loadAndCheckPrefix32(s, 0x70757312, 'Cancel');
        return {
            $: 'Cancel',
        }
    },
    store(self: Cancel, b: c.Builder): void {
        b.storeUint(0x70757312, 32);
    },
    toCell(self: Cancel): c.Cell {
        return makeCellFrom<Cancel>(self, Cancel.store);
    }
}

/**
 > struct (0x70757313) Reclaim {
 > }
 */
export interface Reclaim {
    readonly $: 'Reclaim'
}

export const Reclaim = {
    PREFIX: 0x70757313,

    create(): Reclaim {
        return {
            $: 'Reclaim',
        }
    },
    fromSlice(s: c.Slice): Reclaim {
        loadAndCheckPrefix32(s, 0x70757313, 'Reclaim');
        return {
            $: 'Reclaim',
        }
    },
    store(self: Reclaim, b: c.Builder): void {
        b.storeUint(0x70757313, 32);
    },
    toCell(self: Reclaim): c.Cell {
        return makeCellFrom<Reclaim>(self, Reclaim.store);
    }
}

// ————————————————————————————————————————————
//    class PushkaEscrow
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

export class PushkaEscrow implements c.Contract {
    static CodeCell = c.Cell.fromBase64('te6ccgECDAEAAfcAART/APSkE/S88sgLAQIBYgIDA8DQ+JGRMOAgxwCONDDtRND6SNM/MfpIMdMH10zQ+lAx+gD6ADHTHzHTDzHRAcAB8uEs+JJYxwXy4TL4l7vy4S3g1ywjg6uYjOMC1ywjg6uYlOMC1ywjg6uYnDHjAoQP8vAEBQYCASAICQH+MO1E0PpI0z/6SNMHINdM0PpQ+gD6ANMf0w/RBsAB8uEs+CO88uEu+JchvvLhLSJukTKZ+JJQA8cF8uEw4lIUqIEnEKkEZqEmyPpSJs8LP1JQ+lLPhAoTzsntVPiSyM+FCPpSUAP6AnDPC2rJcfsAyM+FCBX6UgH6AoIQcHVzAQcAiDDtRND6SDHTPzH6SNMH10zQ+lAx+gAx+gAx0x/TDzHRAcAB8uEs+JIixwXy4TH4I7zy4S7Iz4UI+lJwzwtuyYEAoPsAAIbtRND6SDHTPzH6SNMH10zQ+lAx+gAx+gAx0x/TDzHRAcAB8uEs+JIixwXy4TH4I7vy4S/Iz4UI+lJwzwtuyYEAoPsAADrPC4oSyz/JcfsAyM+FCPpSAfoCcM8LasmBAKD7AAAnvXivaiaH0kGOmfmP0kGOmD6hjowCAVgKCwAftg1dqJofSRpn/0kaYPqaMAA/tp+9qJofSQY6Z+Y/SQY6YOY6mjofSh9AH0AaY/ph+jA=');

    static Errors = {
        'Errors.WrongState': 300,
        'Errors.Underfunded': 301,
        'Errors.DeadlinePassed': 302,
        'Errors.DeadlineNotReached': 303,
        'Errors.NotTaker': 304,
        'Errors.NotMaker': 305,
        'Errors.NotFactory': 306,
        'Errors.InvalidMessage': 65535,
    }

    readonly address: c.Address
    readonly init: { code: c.Cell, data: c.Cell } | undefined

    protected constructor(address: c.Address, init?: { code: c.Cell, data: c.Cell }) {
        this.address = address;
        this.init = init;
    }

    static fromAddress(address: c.Address) {
        return new PushkaEscrow(address);
    }

    static fromStorage(emptyStorage: {
        factory: c.Address
        dealId: uint64
        maker: c.Address
        state: uint8
        terms: CellRef<EscrowTerms>
    }, deployedOptions?: DeployedAddrOptions) {
        const initialState = {
            code: deployedOptions?.overrideContractCode ?? PushkaEscrow.CodeCell,
            data: EscrowStorage.toCell(EscrowStorage.create(emptyStorage)),
        };
        const address = calculateDeployedAddress(initialState.code, initialState.data, deployedOptions ?? {});
        return new PushkaEscrow(address, initialState);
    }

    static createCellOfAccept(body: {
    }) {
        return Accept.toCell(Accept.create());
    }

    static createCellOfCancel(body: {
    }) {
        return Cancel.toCell(Cancel.create());
    }

    static createCellOfReclaim(body: {
    }) {
        return Reclaim.toCell(Reclaim.create());
    }

    async sendDeploy(provider: ContractProvider, via: Sender, msgValue: coins, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: c.Cell.EMPTY,
            ...extraOptions
        });
    }

    async sendAccept(provider: ContractProvider, via: Sender, msgValue: coins, body: {
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: Accept.toCell(Accept.create()),
            ...extraOptions
        });
    }

    async sendCancel(provider: ContractProvider, via: Sender, msgValue: coins, body: {
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: Cancel.toCell(Cancel.create()),
            ...extraOptions
        });
    }

    async sendReclaim(provider: ContractProvider, via: Sender, msgValue: coins, body: {
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: Reclaim.toCell(Reclaim.create()),
            ...extraOptions
        });
    }

    async getDetails(provider: ContractProvider): Promise<EscrowStorage> {
        const r = StackReader.fromGetMethod(5, await provider.get('details', []));
        return ({
            $: 'EscrowStorage',
            factory: r.readSlice().loadAddress(),
            dealId: r.readBigInt(),
            maker: r.readSlice().loadAddress(),
            state: r.readBigInt(),
            terms: r.readCellRef<EscrowTerms>(EscrowTerms.fromSlice),
        });
    }

    async getTerms(provider: ContractProvider): Promise<EscrowTerms> {
        const r = StackReader.fromGetMethod(5, await provider.get('terms', []));
        return ({
            $: 'EscrowTerms',
            takerPinned: r.readNullable<c.Address>(
                (r) => r.readSlice().loadAddress()
            ),
            giveAmount: r.readBigInt(),
            wantAmount: r.readBigInt(),
            deadline: r.readBigInt(),
            feeBps: r.readBigInt(),
        });
    }

    async getState(provider: ContractProvider): Promise<uint8> {
        const r = StackReader.fromGetMethod(1, await provider.get('state', []));
        return r.readBigInt();
    }
}
