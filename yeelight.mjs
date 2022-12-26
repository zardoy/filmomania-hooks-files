//@ts-check
// dev: esbuild ./yeelight.mjs --bundle --outfile=C:\Users\Vitaly\AppData\Roaming\Electron\hooks-file.js --format=cjs --platform=node --watch
import { Yeelight } from 'yeelight-awesome'
import { Discover, } from 'yeelight-awesome'

export const mpvStarted = (socket, { observeProperty, onClose }) => {
    const discover = new Discover({ port: 1982 })
    /** @type {Yeelight | undefined} */
    let connectedLight
    let originalBrightness
    discover.once('deviceAdded', (/** @type {import('yeelight-awesome').IDevice} */device) => {
        const yeelight = new Yeelight({
            lightIp: device.host,
            lightPort: device.port,
        })
        yeelight.on('connected', async () => {
            connectedLight = yeelight
            originalBrightness = device.bright
        })
        yeelight.connect()
    })

    // make sure you call this
    discover.start()

    onClose(async () => {
        if (connectedLight) {
            await connectedLight.setBright(originalBrightness)
            connectedLight.disconnect()
        }
        discover.destroy()
    })

    observeProperty('pause', (data) => {
        if (!connectedLight) return
        connectedLight.setPower(true)
        connectedLight.setBright(data ? 100 : 10, 'smooth')
    })
}
