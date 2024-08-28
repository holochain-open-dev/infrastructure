import {
	AgentPubKey,
	AppClient,
	AppCreateCloneCellRequest,
	AppEvents,
	AppInfo,
	AppNetworkInfoRequest,
	AppSignalCb,
	CallZomeRequest,
	CellId,
	ClonedCell,
	DisableCloneCellRequest,
	DisableCloneCellResponse,
	EnableCloneCellRequest,
	EnableCloneCellResponse,
	NetworkInfoResponse,
	decodeHashFromBase64,
} from '@holochain/client';
import Emittery, { UnsubscribeFunction } from 'emittery';

const sleep = (ms: number) =>
	new Promise(r => {
		setTimeout(() => r(null), ms);
	});

export class ZomeMock implements AppClient {
	emitter = new Emittery();

	constructor(
		protected roleName: string,
		protected zomeName: string,
		public installedAppId = 'mock_installed_app_id',
		public myPubKey: AgentPubKey = decodeHashFromBase64(
			'uhCAk13OZ84d5HFum5PZYcl61kHHMfL2EJ4yNbHwSp4vn6QeOdFii',
		),
		protected latency: number = 500,
	) {}

	get cellId(): CellId {
		return [
			decodeHashFromBase64('uhCAk6oBoqygFqkDreZ0V0bH4R9cTN1OkcEG78OLxVptLWOI'),
			this.myPubKey,
		];
	}

	async appInfo(): Promise<AppInfo> {
		return {
			agent_pub_key: this.myPubKey,
			installed_app_id: this.installedAppId,
			status: 'running',
			cell_info: {
				[this.roleName]: [
					{
						provisioned: {
							cell_id: this.cellId,
							name: this.roleName,
							dna_modifiers: {
								network_seed: '',
								origin_time: Date.now(),
								properties: undefined,
								quantum_time: {
									secs: Date.now() / 1000,
									nanos: 0,
								},
							},
						},
					},
				],
			},
		};
	}

	createCloneCell(_args: AppCreateCloneCellRequest): Promise<ClonedCell> {
		throw new Error('Method not implemented.');
	}

	enableCloneCell(
		_args: EnableCloneCellRequest,
	): Promise<EnableCloneCellResponse> {
		throw new Error('Method not implemented');
	}

	disableCloneCell(
		_args: DisableCloneCellRequest,
	): Promise<DisableCloneCellResponse> {
		throw new Error('Method not implemented');
	}

	networkInfo(_args: AppNetworkInfoRequest): Promise<NetworkInfoResponse> {
		throw new Error('Method not implemented');
	}

	async callZome(req: CallZomeRequest): Promise<any> {
		await sleep(this.latency);
		return (this as any)[req.fn_name](req.payload);
	}

	on<Name extends keyof AppEvents>(
		eventName: Name | readonly Name[],
		listener: AppSignalCb,
	): UnsubscribeFunction {
		return this.emitter.on(eventName, listener);
	}

	protected emitSignal(payload: any) {
		this.emitter.emit('signal', {
			cell_id: this.cellId,
			zome_name: this.zomeName,
			payload,
		});
	}
}
