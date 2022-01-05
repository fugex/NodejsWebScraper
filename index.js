const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');
const json = require('./endpoints.json');

const exec = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const listOfEvents = [];

  for (let item of json) {
    let group = item.group;
    let subgroups = [];
    for (let endpoint of item.subgroup) {
      await page.goto(endpoint);

      const moreEvents = await page.evaluate(() => {
        return document.querySelector(
          '.js-modulehelper--eventListPaging-trigger'
        )
          ? true
          : false;
      });

      //Lazy loaded events
      if (moreEvents) {
        await page.waitFor(1000);
        await page.click('a.a-pagination_loadMoreTrigger');
        await page.waitForFunction(
          () => document.querySelectorAll('.o-eventList').length > 1
        );
        await autoScroll(page);
      }

      const subgroupedEvents = await page.evaluate(async () => {
        //get a name of a group
        const group = document.querySelector('.m-pageHeader h1').innerText;
        const items = document.querySelectorAll('.m-eventListItem');
        let groupEvents = [];

        //Gets time, date and location from events
        for (let item of items) {
          const divs = Array.from(
            item.querySelectorAll('.m-eventListItem__block')
          );
          divs.pop();
          let mdiv = divs[0].querySelector('.a-badgeDate');
          let twoDates = mdiv.querySelectorAll('.a-badgeDate__date');

          //Gets only date if is longer than 1day
          if (twoDates.length === 2) {
            groupEvents.push({
              day1: twoDates[0].innerText,
              day2: twoDates[1].innerText,
            });
          } else {
            //Gets day, month and time of event
            let oneDate = mdiv.querySelectorAll('span');
            groupEvents.push({
              day: oneDate[1].innerText,
              month: oneDate[2].innerText,
              time: oneDate[3].innerText,
            });
          }
          let indx = groupEvents.length - 1;
          //Gets location of a event
          let title = divs[1].querySelector(
            '.m-eventListItem__title'
          ).innerText;
          let address = divs[1].querySelector(
            '.m-eventListItem__venue'
          ).innerText;
          let city = divs[1].querySelector(
            '.m-eventListItem__address'
          ).innerText;
          groupEvents[indx] = {
            ...groupEvents[indx],
            title,
            address,
            city,
          };
        }
        return {
          group,
          events: groupEvents,
        };
      });
      subgroups.push(subgroupedEvents);
    }
    listOfEvents.push({
      group,
      subGroups: subgroups,
    });
  }

  //Exit
  await browser.close();

  fs.writeFile('eventlist.json', JSON.stringify(listOfEvents), (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('File successfully written!');
  });
};
exec();

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
