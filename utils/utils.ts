import * as fs from 'fs';
export const PACKET_STATUS = {
    VALID: 'VALID',
    PARTIAL: 'PARTIAL',
    INVALID: 'INVALID'
};
const syncByte: number = 0x47;
const packetSize: number = 188;

export function packetValidator(packet: Buffer, set: Set<number>) {
    if (packet.length !== packetSize) return PACKET_STATUS.PARTIAL;
    if (packet[0] !== syncByte) return PACKET_STATUS.INVALID;

    const pid = ((packet[1] & 0x1F) << 8) | packet[2]
    set.add(pid);
    return PACKET_STATUS.VALID;
}

export function parseTsFile(filePath: string) {
    const stream = fs.createReadStream(filePath, { highWaterMark: packetSize });
    let count = 0;
    const pidSet = new Set<number>();
    stream.on('data', (packet: Buffer) => {
        const pid: string | null = packetValidator(packet, pidSet);
        if (pid == PACKET_STATUS.PARTIAL) {
            return
        }
        if (pid === PACKET_STATUS.INVALID) {
            console.log(`Error: No sync byte present in packet ${count}, offset ${count * 188}`);
            process.exit(1);
        }
        count++;
    });

    stream.on('error', (err: Error) => {
        console.log('Error:', err);
        process.exit(1);
    });

    stream.on('end', () => {
        const pidList = Array.from(pidSet);
        pidList.sort((a: number, b: number) => a - b)
        pidList.forEach(e => console.log(`0x${e.toString(16)}`))
        process.exit(0);
    });
}