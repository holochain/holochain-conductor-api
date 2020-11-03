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

  private _requester = <ReqO, ReqI, ResI, ResO>(
    tag: string,
    transformer?: Transformer<ReqO, ReqI, ResI, ResO>
  ): Requester<ReqO, ResO> =>
    requesterTransformer(
      (req) => this.client.request(req).then(catchError),
      tag,
      transformer
    )

  appInfo = (req: AppInfoRequest): Promise<AppInfoResponse> => {
    return this._requester<
      AppInfoRequest,
      AppInfoRequest,
      AppInfoResponse,
      AppInfoResponse
    >('app_info')(req)
  }

  callZome = (
    req: CallZomeRequestGeneric<any>
  ): Promise<CallZomeResponseGeneric<any>> => {
    return this._requester<
      CallZomeRequestGeneric<any>,
      CallZomeRequestGeneric<Buffer>,
      CallZomeResponseGeneric<Buffer>,
      CallZomeResponseGeneric<any>
    >(
      'zome_call_invocation',
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
