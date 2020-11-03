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

const API_TAGS = {
  ACTIVATE_APP: 'activate_app',
  ATTACH_APP_INTERFACE: 'attach_app_interface',
  DEACTIVATE_APP: 'deactivate_app',
  DUMP_STATE: 'dump_state',
  GENERATE_AGENT_PUB_KEY: 'generate_agent_pub_key',
  INSTALL_APP: 'install_app',
  LIST_DNAS: 'list_dnas',
  LIST_ACTIVE_APP_IDS: 'list_active_app_ids',
  LIST_CELL_IDS: 'list_cell_ids',
}

export class AdminWebsocket implements AdminApi {
  client: WsClient

  constructor(client: WsClient) {
    this.client = client
  }

  static async connect(url: string): Promise<AdminWebsocket> {
    const wsClient = await WsClient.connect(url)
    return new AdminWebsocket(wsClient)
  }

  private _createRequester = <ReqO, ReqI, ResI, ResO>(
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
    return this._createRequester<
      ActivateAppRequest,
      ActivateAppRequest,
      ActivateAppResponse,
      ActivateAppResponse
    >(API_TAGS.ACTIVATE_APP)(req)
  }
  attachAppInterface = (
    req: AttachAppInterfaceRequest
  ): Promise<AttachAppInterfaceResponse> => {
    return this._createRequester<
      AttachAppInterfaceRequest,
      AttachAppInterfaceRequest,
      AttachAppInterfaceResponse,
      AttachAppInterfaceResponse
    >(API_TAGS.ATTACH_APP_INTERFACE)(req)
  }
  deactivateApp = (
    req: DeactivateAppRequest
  ): Promise<DeactivateAppResponse> => {
    return this._createRequester<
      DeactivateAppRequest,
      DeactivateAppRequest,
      DeactivateAppResponse,
      DeactivateAppResponse
    >(API_TAGS.DEACTIVATE_APP)(req)
  }
  dumpState = (req: DumpStateRequest): Promise<DumpStateResponse> => {
    return this._createRequester<
      DumpStateRequest,
      DumpStateRequest,
      string,
      DumpStateResponse
    >(
      API_TAGS.DUMP_STATE,
      dumpStateTransform
    )(req)
  }
  generateAgentPubKey = (
    req: GenerateAgentPubKeyRequest
  ): Promise<GenerateAgentPubKeyResponse> => {
    return this._createRequester<
      GenerateAgentPubKeyRequest,
      GenerateAgentPubKeyRequest,
      GenerateAgentPubKeyResponse,
      GenerateAgentPubKeyResponse
    >(API_TAGS.GENERATE_AGENT_PUB_KEY)(req)
  }
  installApp = (req: InstallAppRequest): Promise<InstallAppResponse> => {
    return this._createRequester<
      InstallAppRequest,
      InstallAppRequest,
      InstallAppResponse,
      InstallAppResponse
    >(API_TAGS.INSTALL_APP)(req)
  }
  listDnas = (req: ListDnasRequest): Promise<ListDnasResponse> => {
    return this._createRequester<
      ListDnasRequest,
      ListDnasRequest,
      ListDnasResponse,
      ListDnasResponse
    >(API_TAGS.LIST_DNAS)(req)
  }
  listCellIds = (req: ListCellIdsRequest): Promise<ListCellIdsResponse> => {
    return this._createRequester<
      ListCellIdsRequest,
      ListCellIdsRequest,
      ListCellIdsResponse,
      ListCellIdsResponse
    >(API_TAGS.LIST_CELL_IDS)(req)
  }
  listActiveAppIds = (
    req: ListActiveAppIdsRequest
  ): Promise<ListActiveAppIdsResponse> => {
    return this._createRequester<
      ListActiveAppIdsRequest,
      ListActiveAppIdsRequest,
      ListActiveAppIdsResponse,
      ListActiveAppIdsResponse
    >(API_TAGS.LIST_ACTIVE_APP_IDS)(req)
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
