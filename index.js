const puppeteer = require('puppeteer');
const config = require('./config.json');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const url = 'https://cars.av.by/filter?year[min]=2000&price_usd[max]=3000&place_city[0]=2&place_region=1005&seller_type[0]=1&sort=4';

async function fetchProductList(url) {

    const browser = await puppeteer.launch({ 
        headless: true,
        defaultViewport: null,
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const parsedAdv = await page.evaluate(() => {
        let totalPageCars = Array.from(document.querySelectorAll('div.listing-item'));

        let carsList = [];

        for (let i = 0; i < totalPageCars.length; i++) {
            let car = {
                brand: '',
                year: '',
                mileage: '',
                engine: '',
                gearboxType: '',
                city: '',
                price: '',
                date: ''
            };
            const currentNodeCar = totalPageCars[i];

            car.brand = currentNodeCar.querySelector('span.link-text').textContent;
            car.year = currentNodeCar.querySelector('.listing-item__params div:first-child').textContent;
            car.mileage = currentNodeCar.querySelector('.listing-item__params div span').textContent;
            car.engine = currentNodeCar.querySelector('.listing-item__params div:nth-child(2)').textContent.split(', ').slice(1).join(', ');
            car.gearboxType = currentNodeCar.querySelector('.listing-item__params div:nth-child(2)').textContent.split(', ')[0].toString();
            car.city = currentNodeCar.querySelector('.listing-item__location').textContent;
            car.price = currentNodeCar.querySelector('.listing-item__priceusd').textContent.match(/\d*\s?\d*\s[$]/).toString();
            car.date = dateConverter(currentNodeCar.querySelector('.listing-item__date').textContent);
            car.dateOrigin = currentNodeCar.querySelector('.listing-item__date').textContent;

            carsList = carsList.concat(car)
        }

        function dateConverter (date) {
            const now = new Date();
            const currentDay = now.getDate();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            let result;
            if (/дней|день|дня/.test(date)) {
                const daysAgo = parseInt(date);
                const day = currentDay - daysAgo;
                result = `${day}.${currentMonth}.${currentYear}`;
                return result;
            }
            if (/(\d+\sминут)|(час)|(только что)/.test(date)) {
                result = `${currentDay}.${currentMonth}.${currentYear}`;
                return result;
            }
            if (/вчера/.test(date)) {
                const day = currentDay - 1;
                result = `${day}.${currentMonth}.${currentYear}`;
                return result;
            }
            let dateArr = date.split(' ');
            let monthArr = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
            let day = dateArr[0];
            let monthString = dateArr[1];
            let monthNum = monthArr.indexOf(monthString) + 1;
            let year = currentYear;
            if (/\d\d\d\d/.test(dateArr[2])) {
                year = dateArr[2]
            }
            result = day +'.' + monthNum + '.' +year;
            return result;
        }

        return carsList;
    });
    console.log(parsedAdv, parsedAdv.length);

    sendMsg(parsedAdv[0]);

  function sendMsg(data) {
    const url = 'https://api.telegram.org/bot'+config.telegram.token+'/sendMessage';

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        chat_id: config.telegram.chat,
        text: `Новое объявление: ${data.brand}, ${data.year}, ${data.mileage}, ${data.engine}, ${data.gearboxType}, ${data.city}, ${data.price}, ${data.date}`
    }));

    xhr.onload = function() {
        if (xhr.status != 200) { 
          console.log(`Ошибка ${xhr.status}: ${xhr.statusText}`);
        } else { 
          console.log(`Готово, получили ${xhr.response}`); 
        }
      };
}

    await browser.close();
}

fetchProductList(url);
