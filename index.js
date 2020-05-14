const inquirer = require('inquirer');
const fetch = require('node-fetch');
const AbortController = require('abort-controller');

const headers = {
    headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4136"
    }
};

let controller = new AbortController();
setTimeout(() => controller.abort(), 1000);

function timeoutPromise(ms, promise) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('timeout'))
        }, ms);
        promise.then(
            (res) => {
            clearTimeout(timeoutId);
            resolve(res);
        },
        (err) => {
            clearTimeout(timeoutId);
            reject(err);
        })
    })
}

async function main() {
    try {
        let url;

        await inquirer.prompt([
            {
                name: 'url',
                message: 'Enter Shopify url:'
            }])
        .then(answer => {
            url = answer.url;
        });
        
        timeoutPromise(1000, fetch(`${url}.json`, headers))
            .then(response => response.json())
            .then(data => {
                try {
                    console.log();
                    for (let i = 0; i < data['product']['variants'].length; i++) {
                        console.log(`${data['product']['variants'][i]['title']} - ${data['product']['variants'][i]['id']}`);
                    }
                } catch (err) {
                    if (err.message.includes('Cannot read property') && err.message.includes('of undefined')) {
                        throw new Error('undefined');
                    } else {
                        throw err;
                    }
                }
            })
            .catch(err => {
                if (err.message == 'timeout' || err.message == 'undefined') {
                    console.log('Site must be Shopify');
                } else {
                    throw err;
                }
            });        
    } catch (err) {
        throw err;
    }
}

main();