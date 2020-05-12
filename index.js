var inquirer = require('inquirer');
const fetch = require('node-fetch');

const headers = {
    headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4136"
    }
}

async function main() {
    try {
        let url;

        await inquirer.prompt([
            {
                name: 'url',
                message: 'Enter shopify url:'
            }])
        .then(answer => {
            url = answer.url;
        }).

        await fetch(`${url}.json`, headers)
            .then(response => response.json())
            .then(function (data) {
                if (data['product']['variants'][0]['inventory_management'] === 'shopify') {
                    for (let i = 0; i < data['product']['variants'].length; i++) {
                        console.log(`${data['product']['variants'][i]['title']} - ${data['product']['variants'][i]['id']}`);
                    }
                } else {
                    console.log('Site is not shopify');
                }
            })
            .catch(error => {
                console.log(error);
            })
    } catch (e) {
        console.log(e);
    }
}

main();