const fetch = require('node-fetch');
const fs = require('fs');
const readline = require('readline');
const sleep = require('util').promisify(setTimeout);

let rl = readline.createInterface({
    input: process.stdin,
});

// To pause the program, type pause in the console and press enter!

let config = {
    // The delay of the for loop in millisecond. Change it if your machine or router can't handle this amount of packages being send to Google API
    delay: 10,
    // The retry delay in second when your internet got disconnected or anything went wrong with fetch();
    retryDelay: 10,
    // Whether the program edits the percentage text or prints it to a new line
    newLine: false,
}

console.log('Server started!');

process.on('uncaughtException', (err) => {
    if (!config.newLine) console.log('\n');
    console.log(err);
    console.log('Press any key to exit!')

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.on('keypress', () => {
        process.exit();
    });
})

function request(start) {
    return new Promise((resolve, reject) => {
        fetch(`https://api.pi.delivery/v1/pi?start=${start}&numberOfDigits=1000`).then(res => res.json().then(json => {
            resolve(json.content);
        })).catch(() => {
            reject('Fail fetching contents from https://api.pi.delivery/v1');
        });
    })
}

let still = false;
function log(string, error) {
    if (error) {
        if (still) {
            console.log('\x1b[41m%s\x1b[0m', `\n${string}`);
            still = false;
        }
        else console.log('\x1b[41m%s\x1b[0m', string);
    }
    else {
        if (config.newLine) {
            console.log(string);
        }
        else {
            still = true;
            process.stdout.cursorTo(0);
            process.stdout.write(string);
        }
    }
}

let moretrillion = 100000000000000;

let stream = fs.createWriteStream('pi.txt');

let id = 0;
let stop = false;
let paused = false;

rl.on('line', input => {
    if (!config.newLine) console.log('\n');
    switch (input.toLowerCase()) {
        case 'pause':
            if (paused) return console.log('The process is already paused!');
            paused = true;
            console.log('Process paused, use resume to resume the process!');
            break;
        case 'resume':
            if (!paused) return console.log('The process isn\'t paused!');
            paused = false;
            console.log('Resumed!');
            break;
        case 'exit':
            process.exit();
        default:
            console.log('Unknow command!');
            break;
    }
});

(async () => {
    for (let i = 0; i <= moretrillion; i += 1000) {
        if (stop || paused) {
            while (true) {
                await sleep(config.delay);
                if (!stop && !paused) break;
            }
        }
        (async () => {
            let myStop = false;
            while (true) {
                let content = await request(i).catch(async err => {
                    if ((!stop || myStop) && !paused) {
                        stop = true;
                        myStop = true;
                        log(`${err}, retry in ${config.retryDelay} seconds!`, true);
                    }
                    await sleep(config.retryDelay * 1000);
                    return null;
                });

                if (!content) {
                    await sleep(config.delay);
                    continue;
                }
                if (myStop) stop = false;

                while (true) {
                    if (id === i) {
                        stream.write(content);
                        id += 1000;

                        let percent = i / moretrillion * 100;
                        let formatted = i.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                        log(`${formatted}/100,000,000,000,000 pi numbers queried [${percent.toFixed(9)}%]`);
                        if (i === moretrillion) end();
                        break;
                    }
                    else {
                        await sleep(content.delay);
                        continue;
                    }
                }
                break;
            }
        })();
        await sleep(config.delay);
    }
})();

function end() {
    if (!config.newLine) console.log('\n');
    console.log('All pi queried, press any key to exit!');

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.on('keypress', () => {
        process.exit();
    });
}