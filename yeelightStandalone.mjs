//@ts-check
// input-ipc-server=\\.\pipe\mpvsocket
// script = C:\Users\Vitaly\Documents\repos\filmomania-hooks-files\mpvSource.js
import { Yeelight } from 'yeelight-awesome'
import { Discover, } from 'yeelight-awesome'
import MpvSocket from "mpv/socket.js"

let prevDiscover
/** @type {Yeelight | undefined} */
let connectedLight
let originalBrightness
const connectYeelight = () => {
    if (prevDiscover) prevDiscover.destroy()
    const discover = new Discover({ port: 1982 })
    discover.once('deviceAdded', (/** @type {import('yeelight-awesome').IDevice} */device) => {
        const yeelight = new Yeelight({
            lightIp: device.host,
            lightPort: device.port,
        })
        yeelight.on('connected', async () => {
            connectedLight = yeelight
            console.log('connected')
            originalBrightness = device.bright
        })
        yeelight.connect()
    })
    // make sure you call this
    discover.start()
    prevDiscover = discover
}

connectYeelight()


//@ts-ignore
const socket = new MpvSocket('\\\\.\\pipe\\mpvsocket', () => {
    socket.emit("connection-close")
    console.log("mpv socket closed")
    process.exit()
})
let enable = true
let min = 10
let max = 100
socket.on("event", async (_, e) => {
    if (e.event === 'client-message') {
        const [name, value] = e.args
        if (name === 'e') enable = value !== 'false'
        else if (name === 'min') min = Number(value)
        else if (name === 'max') max = Number(value)
        else if (name === 'connect') connectYeelight()
    }
    if (e.event !== "property-change") return
    if (e.name === 'pause') {
        if (!connectedLight || !enable) return
        const newBrightness = e.data ? max : min;
        if (newBrightness === 0) connectedLight.setPower(false, 'smooth')
        else {
            connectedLight.setPower(true, 'smooth')
            connectedLight.setBright(newBrightness, 'smooth')
        }
    }
})
socket.on('connect', () => {
    sendMpvCommand('print-text', '[js script init]')
    sendMpvCommand("observe_property", 0, 'pause')
})

const sendMpvCommand = (...args) => {
    if (!socket) {
        throw new Error("Mpv is not active")
    }
    return socket.send(...args)
}

let reported = false
process.on('uncaughtException', () => {
    if (reported) return
    reported = true
    sendMpvCommand('show-text', 'mpv script crashed')
})
