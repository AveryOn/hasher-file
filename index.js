const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Создание интерфейса для чтения и записи
const rl = readline.createInterface({
    input: process.stdin,  // Стандартный ввод
    output: process.stdout  // Стандартный вывод
});
const iv = crypto.randomBytes(16);  // 16 байт для IV (инициализационный вектор)
let TEMP_FILENAME = null;


function readFile(filename, encoding='utf-8') {
    return new Promise((res, rej) => {
        fs.readFile(path.join(__dirname, filename), { encoding }, (err, data) => {
            if(err) rej(err);
            res(data);
        })
    })
}

function writeFile(filename, data, encoding='utf-8') {
    return new Promise((res, rej) => {
        fs.writeFile(path.join(__dirname, filename), data, { encoding }, (err) => {
            if(err) rej(err);
            res(true);
        })
    })
}

function removeFile(filename) {
    return new Promise((res, rej) => {
        fs.unlink(filename, (err) => {
            res(0);
        });
    });
}


// Шифрование данных
function encryptDataIO() {
    console.clear();
    console.log(`Enter filename for hashed: `);
    rl.question('#=> ', async (filename) => {
        const data = await readFile(filename).catch((err) => {
            return encryptDataIO();
        });
        console.clear();
        // Ввод имени выходного файла
        console.log('Enter output filename (with ext.)\n');
        rl.question('#=> ', async (outputFile) => {
            // Ввод пароля
            console.clear();
            console.log('Enter your password: ');
            rl.question('#=> ', async (password) => {
                const key = crypto.createHash('sha256').update(password).digest();
                const res = encryptData(data, key, iv);
                await writeFile(outputFile, res, 'hex');
                console.clear();
                console.log('Successful!');
                rl.close();
            });
        });


    });
}

async function decryptDataIO() {
    console.clear();
    console.log(`Enter hashed filename: `);
    rl.question('#=> ', async (filename) => {
        const hash = await readFile(filename, 'hex').catch((err) => {
            return encryptDataIO();
        });
        function askPswrd() {
            console.clear();
            console.log('Enter your password: ');
            rl.question('#=> ', async function (password) {
                try {
                    const key = crypto.createHash('sha256').update(password).digest();
                    const data = decryptData(hash, key, iv);
                    TEMP_FILENAME = `temp-${Date.now()}.txt`;
                    await writeFile(TEMP_FILENAME, data, 'utf-8');
                    beforeExit();
                } catch (err) {
                    if(err.code === 'ERR_OSSL_BAD_DECRYPT') {
                        console.clear();
                        console.log('Invalid password. Try again...');
                        setTimeout(() => {
                            askPswrd();
                        }, 3000);
                    }
                }
    
            });
        }
        askPswrd();
    });
}

function menu() {
    console.clear();
    console.log('Select option:');
    console.log('1. Encrypt new file');
    console.log('2. Read exists hashed file\n');
    rl.question('#=> ', async (input) => { 
        // Создание нового хэшированного файла
        if(input == 1) {
            return encryptDataIO();
        }
        // Чтение существующего хэшированного файла
        else if(input == 2) {
            return decryptDataIO();
        }
    })
}

// Функция для шифрования данных
function encryptData(data, secretKey, iv) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');
    return encryptedData;
}


// Функция для расшифровки данных
function decryptData(encryptedData, secretKey, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');
    return decryptedData;
}


function beforeExit() {
    console.clear();
    console.log(`File "./${TEMP_FILENAME}" has been created in this directory\n`);
    console.log('Для выхода введите 0')
    // Если по истечении таймера процесс не был закрыт, то содержимое temp-файла принудительно шифруется
    setTimeout( async () => {
        const hash = crypto.createHash('sha256').update('fuck you ^_^').digest('base64');
        writeFile(TEMP_FILENAME, `${hash}=fuck_you_^_^`, 'utf-8');
    }, 10*60*1E3);
    rl.question('#=> ', async (stdin) => {
        if(stdin == 0) {
            if(TEMP_FILENAME) {
                await removeFile(TEMP_FILENAME);
            }
            process.exit(0);
        }
        else {
            return beforeExit();
        }
    })
}


menu();

process.on('beforeExit', async (code) => {
    if(TEMP_FILENAME && typeof TEMP_FILENAME !== 'undefined') {
        await removeFile(TEMP_FILENAME);
    }  
    process.exit(0);
});