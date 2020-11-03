import {
  AdminApi,
  ActivateAppRequest,
  ActivateAppResponse,
  AttachAppInterfaceRequest,
  AttachAppInterfaceResponse,
  DeactivateAppRequest,
  DeactivateAppResponse,
  DumpStateRequest,
  DumpStateResponse,
  GenerateAgentPubKeyRequest,
  GenerateAgentPubKeyResponse,
  InstallAppRequest,
  InstallAppResponse,
  ListDnasRequest,
  ListDnasResponse,
  ListCellIdsRequest,
  ListCellIdsResponse,
  ListActiveAppIdsRequest,
  ListActiveAppIdsResponse,
} from '../api/admin'
import { WsClient } from './client'
import { catchError } from './common'
import { Transformer, requesterTransformer, Requester } from '../api/common'

export class AdminWebsocket implements AdminApi {
  client: WsClient

  constructor(client: WsClient) {
    this.client = client
  }

  static async connect(url: string): Promise<AdminWebsocket> {
    const wsClient = await WsClient.connect(url)
    return new AdminWebsocket(wsClient)
  }

  private _requester = <ReqO, ReqI, ResI, ResO>(
    tag: string,
    transformer?: Transformer<ReqO, ReqI, ResI, ResO>
  ): Requester<ReqO, ResO> =>
    requesterTransformer(
      (req) => this.client.request(req).then(catchError),
      tag,
      transformer
    )

  // the specific request/response types come from the Interface
  // which this class implements
  activateApp = (req: ActivateAppRequest): Promise<ActivateAppResponse> => {
    return this._requester<
      ActivateAppRequest,
      ActivateAppRequest,
      ActivateAppResponse,
      ActivateAppResponse
    >('activate_app')(req)
  }
  attachAppInterface = (
    req: AttachAppInterfaceRequest
  ): Promise<AttachAppInterfaceResponse> => {
    return this._requester<
      AttachAppInterfaceRequest,
      AttachAppInterfaceRequest,
      AttachAppInterfaceResponse,
      AttachAppInterfaceResponse
    >('attach_app_interface')(req)
  }
  deactivateApp = (
    req: DeactivateAppRequest
  ): Promise<DeactivateAppResponse> => {
    return this._requester<
      DeactivateAppRequest,
      DeactivateAppRequest,
      DeactivateAppResponse,
      DeactivateAppResponse
    >('deactivate_app')(req)
  }
  dumpState = (req: DumpStateRequest): Promise<DumpStateResponse> => {
    return this._requester<
      DumpStateRequest,
      DumpStateRequest,
      string,
      DumpStateResponse
    >(
      'dump_state',
      dumpStateTransform
    )(req)
  }
  generateAgentPubKey = (
    req: GenerateAgentPubKeyRequest
  ): Promise<GenerateAgentPubKeyResponse> => {
    return this._requester<
      GenerateAgentPubKeyRequest,
      GenerateAgentPubKeyRequest,
      GenerateAgentPubKeyResponse,
      GenerateAgentPubKeyResponse
    >('generate_agent_pub_key')(req)
  }
  installApp = (req: InstallAppRequest): Promise<InstallAppResponse> => {
    return this._requester<
      InstallAppRequest,
      InstallAppRequest,
      InstallAppResponse,
      InstallAppResponse
    >('install_app')(req)
  }
  listDnas = (req: ListDnasRequest): Promise<ListDnasResponse> => {
    return this._requester<
      ListDnasRequest,
      ListDnasRequest,
      ListDnasResponse,
      ListDnasResponse
    >('list_dnas')(req)
  }
  listCellIds = (req: ListCellIdsRequest): Promise<ListCellIdsResponse> => {
    return this._requester<
      ListCellIdsRequest,
      ListCellIdsRequest,
      ListCellIdsResponse,
      ListCellIdsResponse
    >('list_cell_ids')(req)
  }
  listActiveAppIds = (
    req: ListActiveAppIdsRequest
  ): Promise<ListActiveAppIdsResponse> => {
    return this._requester<
      ListActiveAppIdsRequest,
      ListActiveAppIdsRequest,
      ListActiveAppIdsResponse,
      ListActiveAppIdsResponse
    >('list_active_app_ids')(req)
  }
}

const dumpStateTransform: Transformer<
  DumpStateRequest,
  DumpStateRequest,
  string,
  DumpStateResponse
> = {
  input: (req) => req,
  output: (res: string): DumpStateResponse => {
    return JSON.parse(res)
  },
}
