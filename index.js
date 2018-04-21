const request = require('request-promise-native');
const cheerio = require('cheerio');
const fs = require('fs');
const jsonfile = require('jsonfile');


const sleep = (time) => new Promise((resolve) => {
  setTimeout(resolve, time);
});


const getEventsFromHtml = ($) => {
  console.log('Parsing HTML data...');
  const rows = $('tbody tr');

  const events = [];
  
  rows.each((i, row) => {
    const cells = $(row).children('td');

    const event = {
      type: $(cells[1]).text().trim(),
      name: $(cells[2]).text().trim(),
      location: $(cells[3]).text().trim(),
      // status: $(cells[4]).text().trim(),
      datetime: $(cells[5]).text().trim(),
      relativeLink: $(cells[2]).find('a').attr('href')
    };

    if (event.type === 'Premier') {
      const eventName = event.name.toLowerCase();
      if (eventName.includes('release')) {
        event.type = 'Pre-Release';
      } else if (eventName.includes('challenge')) {
        event.type = 'League Challenge';
      } else if (eventName.includes('cup')) {
        event.type = 'League Cup';
      }
    }

    events.push(event);
  });

  let eventsPromise = Promise.resolve();

  events
    .filter(({ type }) => type !== 'Pokémon League')
    .forEach((event) => {
      eventsPromise = eventsPromise
        .then(() => getLocationInfoForEvent(event));
    });

  eventsPromise
    .then(() => console.log('Successfully obtained all data.'))
    .catch(() => console.log('Failed to obtain some data.'))
    .then(() => {
      console.log('Writing events.json...');
      jsonfile.writeFileSync('events.json', events, { spaces: 2 });
      console.log('Finished.');
    });
};


const getLocationInfoForEvent = (event, reattemptDelaySeconds = 10) => {
  console.log(`Fetching data for event: ${event.name}`);

  return request({
    uri: `https://www.pokemon.com${event.relativeLink}`,
    transform: cheerio.load
  })
    .then(($) => {
      console.log(`Parsing HTML data for event: ${event.name}`);
      const forms = $('.whiteBucket form');

      const section1Rows = $(forms[0]).find('ol li');
      const tournamentID = $(section1Rows[1]).contents()[1].data;

      const locationInfoRows = $(forms[2]).find('ol li');

      const location = {
        name: $(locationInfoRows[0]).contents()[1].data,
        address: $(locationInfoRows[1]).contents()[1].data,
        city: $(locationInfoRows[3]).contents()[1].data,
        mapLink: encodeURI($(locationInfoRows[7]).find('a').attr('href'))
      };

      event.tournamentID = tournamentID;
      event.location = location;

      // return sleep(1000);
    })
    .catch((e) => {
      if (e.statusCode !== 503) {
        console.error(e);
        return Promise.reject();
      }

      if (reattemptDelaySeconds > 60) {
        console.log('Giving up.');
        return Promise.reject();
      }

      console.log(`We got caught! Will re-attempt in ${reattemptDelaySeconds} seconds...`);
      return sleep(1000 * reattemptDelaySeconds)
        .then(() => getLocationInfoForEvent(event, reattemptDelaySeconds + 10));
    });
}


console.log('Fetching events data...');
request({
  uri: 'https://www.pokemon.com/us/play-pokemon/pokemon-events/find-an-event/?country=176&postal_code=&city=Phoenix&event_name=&location_name=&address=&state_object=&state_other=&distance_within=25&start_date=0&end_date=30&event_type=league&event_type=tournament&event_type=premier&product_type=tcg&sort_order=when&results_pp=50',
  transform: cheerio.load
})
  .then(getEventsFromHtml);