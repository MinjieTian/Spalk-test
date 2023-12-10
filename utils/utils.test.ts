const { packetValidator, PACKET_STATUS, parseTsFile } = require('./utils');
const { Readable } = require('stream');
const fs = require('fs');

//test for packetValidator function
describe('packetValidator', () => {
    let pidSet: Set<number>;

    beforeEach(() => {
        pidSet = new Set();
    });

    it('should return PARTIAL for partial packets', () => {
        const partialPacket = Buffer.alloc(100, 0);
        const result = packetValidator(partialPacket, pidSet);
        expect(result).toBe(PACKET_STATUS.PARTIAL);
    });

    it('should return INVALID for packets without sync byte', () => {
        const packet = Buffer.alloc(188, 0);
        packet[0] = 0x00;
        const result = packetValidator(packet, pidSet);
        expect(result).toBe(PACKET_STATUS.INVALID);
    });

    it('should return VALID and add PID to set for valid packets', () => {
        const packet = Buffer.alloc(188, 0);
        packet[0] = 0x47; // sync byte
        packet[1] = 0x1F; // second byte
        packet[2] = 0xFF; // third byte

        const result = packetValidator(packet, pidSet);
        expect(result).toBe(PACKET_STATUS.VALID);
        expect(pidSet.has(0x1FFF)).toBeTruthy();
    });
});

describe('parseTsFile', () => {

    let mockStream;
    let consoleLogSpy;

    beforeEach(() => {
        // test for parseTsFile function
        jest.mock('fs');
        // mock console.log
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        // mock process.exit
        jest.spyOn(process, 'exit').mockImplementation((code: number) => code as never);
        // new mockStream for each test
        mockStream = new Readable({
            read() { }
        });
        // mock createReadStrean function, it will only return mockStream
        jest.spyOn(fs, 'createReadStream').mockReturnValue(mockStream);
    });

    afterEach(() => {
        // restore all mock
        jest.restoreAllMocks();
    });

    // restore console.log after tests
    afterAll(() => {
        consoleLogSpy.mockRestore();
    });

    it('read stream failed', (done) => {
        parseTsFile('fakePath');

        mockStream.emit('error', new Error('Simulated Error'));
        setTimeout(() => {
            expect(process.exit).toHaveBeenCalledWith(1);
            done();
        }, 0)
    })

    it('should process and collect valid PIDs', (done) => {


        //create a fake valid packet strean
        const validPacket = Buffer.alloc(188, 0);
        validPacket[0] = 0x47; // sync byte
        validPacket[1] = 0x1F; // PID 
        validPacket[2] = 0xFF; // PID

        parseTsFile('fakePath');

        // mock streams from createReadStream
        mockStream.push(validPacket); // valid packet
        mockStream.push(null); // mock end of the stream

        setTimeout(() => {
            // console.log should be called with '0x1fff'
            expect(console.log).toHaveBeenCalledWith('0x1fff');

            // In the end, process.exit(0) should be called
            expect(process.exit).toHaveBeenCalledWith(0);

            //tell jest test done
            done();
        }, 0);
    });

    it('should process with empty stream and print nothing', (done) => {

        parseTsFile('fakePath');

        mockStream.push(null);

        setTimeout(() => {
            // In the end, process.exit(1) should be called
            expect(process.exit).toHaveBeenCalledWith(0);

            //tell jest test done
            done();
        }, 0);
    })

    it('should not process with invalid sync byte', (done) => {
        //create a fake valid packet strean
        const validPacket = Buffer.alloc(188, 0);
        validPacket[0] = 0x47; // sync byte
        validPacket[1] = 0x1F; // PID 
        validPacket[2] = 0xFF; // PID

        //create a fake invalid packet strean
        const inValidPacket = Buffer.alloc(188, 0);
        inValidPacket[0] = 0x50; // sync byte
        inValidPacket[1] = 0x1F; // PID 
        inValidPacket[2] = 0xFF; // PID

        parseTsFile('fakePath');

        mockStream.push(validPacket);
        mockStream.push(inValidPacket);
        mockStream.push(null);

        setTimeout(() => {

            expect(console.log).toHaveBeenCalledWith('Error: No sync byte present in packet 1, offset 188');

            // In the end, process.exit(1) should be called
            expect(process.exit).toHaveBeenCalledWith(1);

            //tell jest test done
            done();
        }, 0);
    })
});