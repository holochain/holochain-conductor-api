import * as msgpack from '@msgpack/msgpack'

import {
  AppApi,
  AppInfoRequest,
  AppInfoResponse,
  CallZomeRequestGeneric,
  CallZomeResponseGeneric,
  AppSignalCb,
} from '../api/app'
import { WsClient } from './client'
import { catchError } from './common'
import { Transformer, requesterTransformer, Requester } from '../api/common'

const API_TAGS ={
  APP_INFO: 'app_info',
  CALL_ZOME: 'zome_call_invocation'
}

export class AppWebsocket implements AppApi {
  client: WsClient

  constructor(client: WsClient) {
    this.client = client
  }

  static async connect(
    url: string,
    signalCb?: AppSignalCb
  ): Promise<AppWebsocket> {
    const wsClient = await WsClient.connect(url, signalCb)
    return new AppWebsocket(wsClient)
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

  appInfo = (req: AppInfoRequest): Promise<AppInfoResponse> => {
    return this._createRequester<
      AppInfoRequest,
      AppInfoRequest,
      AppInfoResponse,
      AppInfoResponse
    >(API_TAGS.APP_INFO)(req)
  }

  callZome = (
    req: CallZomeRequestGeneric<any>
  ): Promise<CallZomeResponseGeneric<any>> => {
    return this._createRequester<
      CallZomeRequestGeneric<any>,
      CallZomeRequestGeneric<Buffer>,
      CallZomeResponseGeneric<Buffer>,
      CallZomeResponseGeneric<any>
    >(
      API_TAGS.CALL_ZOME,
      callZomeTransform
    )(req)
  }
}

const callZomeTransform: Transformer<
  CallZomeRequestGeneric<any>,
  CallZomeRequestGeneric<Buffer>,
  CallZomeResponseGeneric<Buffer>,
  CallZomeResponseGeneric<any>
> = {
  input: (req: CallZomeRequestGeneric<any>): CallZomeRequestGeneric<Buffer> => {
    req.payload = msgpack.encode(req.payload)
    return req
  },
  output: (
    res: CallZomeResponseGeneric<Buffer>
  ): CallZomeResponseGeneric<any> => {
    return msgpack.decode(res)
  },
}
