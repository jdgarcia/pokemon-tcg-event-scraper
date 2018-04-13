const request = require('request-promise-native');
const cheerio = require('cheerio');
const fs = require('fs');
const jsonfile = require('jsonfile');

const getEventsFromHtml = ($) => {
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
    };

    let category = 'Unknown';
    if (event.type === 'Pokémon League') {
      category = 'League';
    } else if (event.type === 'Premier') {
      const eventName = event.name.toLowerCase();
      if (eventName.includes('release')) {
        category = 'Pre-Release';
      } else if (eventName.includes('challenge')) {
        category = 'League Challenge';
      } else if (eventName.includes('cup')) {
        category = 'League Cup';
      }
    }

    event.category = category;
  
    events.push(event);
  });
  
  jsonfile.writeFileSync('events.json', events, { spaces: 2 });
};

const url = 'https://www.pokemon.com/us/play-pokemon/pokemon-events/find-an-event/?country=176&postal_code=&city=Phoenix&event_name=&location_name=&address=&state_object=&state_other=&distance_within=25&start_date=0&end_date=30&event_type=league&event_type=tournament&event_type=premier&product_type=tcg&sort_order=when&results_pp=50';

const options = {
  uri: url,
  transform: cheerio.load
};

request(options)
  .then(getEventsFromHtml);
  