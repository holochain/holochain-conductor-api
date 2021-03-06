const test = require('tape')

import { AdminWebsocket } from '../../src/websocket/admin'
import { AppWebsocket } from '../../src/websocket/app'
import { WsClient } from '../../src/websocket/client'
import { installAppAndDna, withConductor, launch, CONFIG_PATH, CONFIG_PATH_1, FIXTURE_PATH } from './util'
import { AgentPubKey, fakeAgentPubKey, InstalledAppStatus, InstalledAppInfo } from '../../src/api/types'
import { AppSignal } from '../../src/api/app'
import zlib from 'zlib';
import fs from 'fs';
import { DnaBundle, AppStatusFilter } from '../../src/api/admin'
import { decode } from '@msgpack/msgpack'

const delay = ms => new Promise(r => setTimeout(r, ms))

const ADMIN_PORT = 33001
const ADMIN_PORT_1 = 33002

const TEST_ZOME_NAME = 'foo'

test('admin smoke test: registerDna + installApp', withConductor(ADMIN_PORT, async t => {

  const installed_app_id = 'app'
  const admin = await AdminWebsocket.connect(`http://localhost:${ADMIN_PORT}`, 12000)

  const agent_key = await admin.generateAgentPubKey()
  t.ok(agent_key)

  const path = `${FIXTURE_PATH}/test.dna`;
  const hash = await admin.registerDna({
    path
  })
  t.ok(hash)
  const cell_nick = "thedna"
  const installedApp = await admin.installApp({
    installed_app_id, agent_key, dnas: [{ hash, nick: cell_nick }]
  })

  const status: InstalledAppStatus = installedApp.status
  t.deepEqual(status, { inactive: { reason: { never_activated: null } } })

  const activeApps1 = await admin.listActiveApps()
  console.log('active', activeApps1)
  t.equal(activeApps1.length, 0)



  const allAppsInfo = await admin.listApps({})
  console.log('allAppsInfo', allAppsInfo)
  t.equal(allAppsInfo.length, 1)

  const activeAppsInfo = await admin.listApps({ status_filter: AppStatusFilter.Active })
  const inactiveAppsInfo = await admin.listApps({ status_filter:  AppStatusFilter.Inactive })
  t.equal(activeAppsInfo.length, 0)
  t.equal(inactiveAppsInfo.length, 1)
  t.equal(inactiveAppsInfo[0].cell_data.length, 1)
  t.deepEqual(inactiveAppsInfo[0].status, { inactive: { reason: { never_activated: null } } })

  const activeAppInfo: InstalledAppInfo = await admin.activateApp({ installed_app_id })
  t.deepEqual(activeAppInfo.status, { active: null })
  t.equal(activeAppInfo.cell_data[0].cell_nick, cell_nick)
  t.equal(activeAppInfo.installed_app_id, installed_app_id)

  const activeApps2 = await admin.listActiveApps()
  t.equal(activeApps2.length, 1)
  t.equal(activeApps2[0], installed_app_id)

  const activeAppsInfo2 = await admin.listApps({ status_filter: AppStatusFilter.Active})
  const inactiveAppsInfo2 = await admin.listApps({ status_filter: AppStatusFilter.Inactive })
  console.log('activeAppsInfo2', activeAppsInfo2)
  console.log('inactiveAppsInfo2', inactiveAppsInfo2)
  t.equal(inactiveAppsInfo2.length, 0)
  t.equal(activeAppsInfo2.length, 1)
  t.equal(activeAppsInfo2[0].cell_data.length, 1)
  t.deepEqual(activeAppsInfo2[0].status, { active: null })

  await admin.attachAppInterface({ port: 0 })
  await admin.deactivateApp({ installed_app_id })

  const activeAppsInfo3 = await admin.listApps({ status_filter: AppStatusFilter.Active })
  const inactiveAppsInfo3 = await admin.listApps({ status_filter: AppStatusFilter.Inactive })
  console.log('activeAppsInfo3', activeAppsInfo3)
  console.log('inactiveAppsInfo3', inactiveAppsInfo3)
  t.equal(activeAppsInfo3.length, 0)
  t.equal(inactiveAppsInfo3.length, 1)
  t.deepEqual(inactiveAppsInfo3[0].status, { inactive: { reason: { normal: null } } })

  let dnas = await admin.listDnas()
  t.equal(dnas.length, 1)

  const activeApps3 = await admin.listActiveApps()
  t.equal(activeApps3.length, 0)
  // NB: missing dumpState because it requires a valid cell_id

  // install from hash and uid
  const newHash = await admin.registerDna({
    hash,
    uid: "123456"
  })
  t.ok(newHash)

  dnas = await admin.listDnas()
  t.equal(dnas.length, 2)

}))

test('admin smoke test: installBundle', withConductor(ADMIN_PORT, async t => {

  const installed_app_id = 'app'
  const admin = await AdminWebsocket.connect(`http://localhost:${ADMIN_PORT}`, 12000)

  const agent_key = await admin.generateAgentPubKey()
  t.ok(agent_key)

  const path = `${FIXTURE_PATH}/test.happ`;
  const installedApp = await admin.installAppBundle({
    path,
    agent_key,
    installed_app_id,
    membrane_proofs: {}
  })
  t.ok(installedApp)
  t.deepEqual(installedApp.status, { inactive: { reason: { never_activated: null } } })

  const activeApps1 = await admin.listActiveApps()
  t.equal(activeApps1.length, 0)

  const activeAppInfo: InstalledAppInfo = await admin.activateApp({ installed_app_id })
  t.deepEqual(activeAppInfo.status, { active: null })
  t.equal(activeAppInfo.installed_app_id, installed_app_id)

  const activeApps2 = await admin.listActiveApps()
  t.equal(activeApps2.length, 1)
  t.equal(activeApps2[0], installed_app_id)

  const cellIds = await admin.listCellIds()
  t.equal(cellIds.length, 1)
  t.deepEqual(cellIds[0], installedApp.cell_data[0].cell_id)

  await admin.attachAppInterface({ port: 0 })
  await admin.deactivateApp({ installed_app_id })

  let dnas = await admin.listDnas()
  t.equal(dnas.length, 1)

  const activeApps3 = await admin.listActiveApps()
  t.equal(activeApps3.length, 0)

}))


test('admin register dna with full binary bundle', withConductor(ADMIN_PORT, async t => {

  const installed_app_id = 'app'
  const admin = await AdminWebsocket.connect(`http://localhost:${ADMIN_PORT}`, 12000)

  const agent_key = await admin.generateAgentPubKey()
  t.ok(agent_key)

  const path = `${FIXTURE_PATH}/test.dna`;

  const zippedDnaBundle = fs.readFileSync(path);
  const encodedDnaBundle = zlib.gunzipSync(zippedDnaBundle);

  const dnaBundle: DnaBundle = decode(encodedDnaBundle.buffer) as DnaBundle;
  const hash = await admin.registerDna({
    bundle: dnaBundle
  })
  t.ok(hash)
  const cell_nick = "thedna"
  await admin.installApp({
    installed_app_id, agent_key, dnas: [{ hash, nick: "thedna" }]
  })

  const activeApps1 = await admin.listActiveApps()
  t.equal(activeApps1.length, 0)

  const activeAppInfo: InstalledAppInfo = await admin.activateApp({ installed_app_id })
  t.deepEqual(activeAppInfo.status, { active: null })
  t.equal(activeAppInfo.cell_data[0].cell_nick, cell_nick)
  t.equal(activeAppInfo.installed_app_id, installed_app_id)

  const activeApps2 = await admin.listActiveApps()
  t.equal(activeApps2.length, 1)
  t.equal(activeApps2[0], installed_app_id)

  await admin.attachAppInterface({ port: 0 })
  await admin.deactivateApp({ installed_app_id })

  const dnas = await admin.listDnas()
  t.equal(dnas.length, 1)

  const activeApps3 = await admin.listActiveApps()
  t.equal(activeApps3.length, 0)

}))

test('can call a zome function and then deactivate', withConductor(ADMIN_PORT, async t => {
  const [installed_app_id, cell_id, nick, client, admin] = await installAppAndDna(ADMIN_PORT)
  let info = await client.appInfo({ installed_app_id }, 1000)
  t.deepEqual(info.cell_data[0].cell_id, cell_id)
  t.equal(info.cell_data[0].cell_nick, nick)
  t.deepEqual(info.status, { active: null })
  const response = await client.callZome({
    // TODO: write a test with a real capability secret.
    cap: null,
    cell_id,
    zome_name: TEST_ZOME_NAME,
    fn_name: 'foo',
    provenance: fakeAgentPubKey('TODO'),
    payload: null,
  }, 30000)
  t.equal(response, "foo")

  await admin.deactivateApp({ installed_app_id })
  info = await client.appInfo({ installed_app_id }, 1000)
  t.deepEqual(info.status, { inactive: { reason: { normal: null } } })

}))

test('can call a zome function twice, reusing args', withConductor(ADMIN_PORT, async t => {
  const [installed_app_id, cell_id, nick, client] = await installAppAndDna(ADMIN_PORT)
  const info = await client.appInfo({ installed_app_id }, 1000)
  t.deepEqual(info.cell_data[0].cell_id, cell_id)
  t.equal(info.cell_data[0].cell_nick, nick)
  const args = {
    // TODO: write a test with a real capability secret.
    cap: null,
    cell_id,
    zome_name: TEST_ZOME_NAME,
    fn_name: 'foo',
    provenance: fakeAgentPubKey('TODO'),
    payload: null,
  }
  const response = await client.callZome(args, 30000)
  t.equal(response, "foo")
  const response2 = await client.callZome(args, 30000)
  t.equal(response, "foo")
}))


test('can handle canceled response', withConductor(ADMIN_PORT, async t => {
  // const client = await WsClient.connect(`http://localhost:${ADMIN_PORT}`);A
  const client = new WsClient({ send: (_d) => { } });
  let prom = client.request("blah");
  client.handleResponse({ id: 0 })
  try {
    const resp = await prom;
  } catch (e) {
    t.deepEqual(e, new Error(`Response canceled by responder`))
  }
}))

test('can receive a signal', withConductor(ADMIN_PORT, async t => {
  await new Promise(async (resolve, reject) => {
    try {
      const [installed_app_id, cell_id, _nick, client] = await installAppAndDna(ADMIN_PORT, signalCb)
      function signalCb(signal: AppSignal) {
        t.deepEqual(signal, {
          type: 'Signal',
          data: {
            cellId: cell_id,
            payload: 'i am a signal'
          }
        })
        resolve(null)
      }
      // trigger an emit_signal
      await client.callZome({
        cap: null,
        cell_id,
        zome_name: TEST_ZOME_NAME,
        fn_name: 'emitter',
        provenance: fakeAgentPubKey('TODO'),
        payload: null,
      })
    } catch (e) {
      reject(e)
    }
  })
}))

test(
  'callZome rejects appropriately for ZomeCallUnauthorized',
  withConductor(ADMIN_PORT, async (t) => {
    const [installed_app_id, cell_id, _nick, client] = await installAppAndDna(ADMIN_PORT)
    try {
      await client.callZome({
        // bad cap, on purpose
        cap: Buffer.from(
          // 64 bytes
          '0000000000000000000000000000000000000000000000000000000000000000'
            .split('')
            .map((x) => parseInt(x, 10))
        ),
        cell_id,
        zome_name: TEST_ZOME_NAME,
        fn_name: 'bar',
        provenance: fakeAgentPubKey('TODO'),
        payload: null,
      }, 30000)
    } catch (e) {
      t.equal(e.type, 'error')
      t.equal(e.data.type, 'zome_call_unauthorized')
    }
  })
)

// no conductor
test('error is catchable when holochain socket is unavailable', async (t) => {
  const url = `http://localhost:${ADMIN_PORT}`
  try {
    await AdminWebsocket.connect(url)
  } catch (e) {
    t.equal(
      e.message,
      `could not connect to holochain conductor, please check that a conductor service is running and available at ${url}`
    )
  }

  try {
    await AppWebsocket.connect(url)
  } catch (e) {
    t.equal(
      e.message,
      `could not connect to holochain conductor, please check that a conductor service is running and available at ${url}`
    )
  }
})


test('can inject agents', async (t) => {
  const conductor1 = await launch(ADMIN_PORT, CONFIG_PATH)
  const conductor2 = await launch(ADMIN_PORT_1, CONFIG_PATH_1)
  try {
    const installed_app_id = 'app'
    const admin1 = await AdminWebsocket.connect(`http://localhost:${ADMIN_PORT}`)
    const admin2 = await AdminWebsocket.connect(`http://localhost:${ADMIN_PORT_1}`)
    const agent_key_1 = await admin1.generateAgentPubKey()
    t.ok(agent_key_1)
    const agent_key_2 = await admin2.generateAgentPubKey()
    t.ok(agent_key_2)
    const nick = 'thedna'
    const path = `${FIXTURE_PATH}/test.dna`;
    const hash = await admin1.registerDna({ path })
    t.ok(hash)
    let result = await admin1.installApp({
      installed_app_id, agent_key: agent_key_1, dnas: [{ hash, nick }]
    })
    t.ok(result)
    const app1_cell = result.cell_data[0].cell_id
    const activeApp1Info: InstalledAppInfo = await admin1.activateApp({ installed_app_id }, 1000)
    t.deepEqual(activeApp1Info.status, { active: null })
    t.equal(activeApp1Info.cell_data[0].cell_nick, nick)
    t.equal(activeApp1Info.installed_app_id, installed_app_id)


    await delay(500);

    // after activating an app requestAgentInfo should return the agentid
    // requesting info with null cell_id should return all agents known about.
    // otherwise it's just agents know about for that cell
    const conductor1_agentInfo = await admin1.requestAgentInfo({ cell_id: null });
    t.equal(conductor1_agentInfo.length, 1)

    // agent2 with no activated apps there are no agents
    var conductor2_agentInfo = await admin2.requestAgentInfo({ cell_id: null });
    t.equal(conductor2_agentInfo.length, 0)

    // but, after explicitly injecting an agent, we should see it
    await admin2.addAgentInfo({ agent_infos: conductor1_agentInfo });
    conductor2_agentInfo = await admin2.requestAgentInfo({ cell_id: null });
    t.equal(conductor2_agentInfo.length, 1)
    t.deepEqual(conductor1_agentInfo, conductor2_agentInfo)

    // now install the app and activate it on agent 2.
    await admin2.registerDna({
      path
    })
    t.ok(hash)
    result = await admin2.installApp({
      installed_app_id, agent_key: agent_key_2, dnas: [{ hash, nick }]
    })
    t.ok(result)
    const app2_cell = result.cell_data[0].cell_id
    const activeApp2Info: InstalledAppInfo = await admin2.activateApp({ installed_app_id })
    t.deepEqual(activeApp2Info.status, { active: null })
    t.equal(activeApp2Info.cell_data[0].cell_nick, nick)
    t.equal(activeApp2Info.installed_app_id, installed_app_id)

    await delay(500);
    // observe 2 agent infos
    conductor2_agentInfo = await admin2.requestAgentInfo({ cell_id: null });
    t.equal(conductor2_agentInfo.length, 2)

    // now confirm that we can ask for just one cell
    await admin1.addAgentInfo({ agent_infos: conductor2_agentInfo });
    const app1_agentInfo = await admin1.requestAgentInfo({ cell_id: app1_cell });
    t.equal(app1_agentInfo.length, 1)
    const app2_agentInfo = await admin2.requestAgentInfo({ cell_id: app2_cell });
    t.equal(app2_agentInfo.length, 1)

  }
  finally {
    conductor1.kill()
    conductor2.kill()
  }

})
