// Import stylesheets
import './style.css';
import { fieldData } from './data/field_data.js';
import { recordData } from './data/record_data.js';
import { arr_users } from './data/lookup_definitions.js';

//////////////////
// CONSTANTS
//////////////////
const DEBUG = false;

////////////////
// FUNCTIONS
////////////////
/*  get related Object  */
const getRelatedObjectName = (objName) => {
  const str = objName;
  const searchUserString = 'rest/record/';
  let index = str.indexOf(searchUserString);
  let obj = str.substring(index + searchUserString.length, str.length);
  return obj;
};

/* Clean html strings */
const htmlEscape = (str) => {
  return str
    .replace(/&/g, '&')
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/&nbsp;/g, '')
    .replace(/\r\n/g, '')
    .replace(/>/g, '>')
    .replace(/<>/g, '<');
};

/* iterate over the LJ records file and create a CSV data set to read for downloading */
const makeCSVRecords = (rd) => {
  DEBUG = true;
  //get the records from the JSON response and assign to an array
  const recordArr = rd.platform.record;

  DEBUG ? console.log('RECORD OBJECT \r\n', recordArr) : false;

  //create an array to return for the csv
  const csvArray = [];

  //map over all records to create the array of objects
  const records = _.map(recordArr, (record) => {
    const obj = {};

    _.forEach(record, function (value, key, index) {
      // if this is a user related field, than replace the user id and update the new array
      if (_.isObject(record[key])) {
        const user = record[key]?.uri;
        if (user) {
          const i = user.indexOf('user');
          if (i > 0) {
            const newUserId = swapUserId(parseUserId(user));
            obj[key] = newUserId;

            DEBUG
              ? console.log(`
                           ${key}:${newUserId}
                            previous ld:${parseUserId(user)}`)
              : false;
            return;
          }
        }

        // if this is just content and no need to process any further just grab the content and update the new array
        const relatedObj = record[key]?.content;
        if (relatedObj) {
          obj[key] = relatedObj ? relatedObj : '';
          DEBUG ? console.log(`${key}: ${relatedObj}`) : false;
          return;
        } else {
          obj[key] = record[key].content ? record[key]?.content : '';
          return;
        }
      }
      //return nonobject key:value
      obj[key] = value ? value : '';
      DEBUG ? console.log(key, ':', value) : false;
    });
    //push this into the new array to convert to a csv
    csvArray.push(obj);
  });

  DEBUG ? console.log('ARRAY \r\n', csvArray) : false;
  return csvArray;
};

/* Make field object into new fields object */
const makeFieldObject = () => {
  const arr = fieldData.platform.field;
  const fieldMap = _.map(arr, (i) => {
    const obj = {};

    switch (i.type) {
      default:
        {
          obj[i.tableColumn] = eval(`'n.${i.tableColumn}'`);

          return obj;
        }
        break;

      case 'LOOKUP':
        {
          if (i?.lookUpObjectId.content == 'USER') {
            obj['tableColumn'] = eval(`swapUserId('${i.tableColumn}')`);
            obj['type'] = eval(`swapUserId('${i.type}')`);
          } else {
            obj['tableColumn'] = eval(`swapUserId('${i.tableColumn}')`);
            obj['type'] = eval(`swapUserId('${i.type}')`);
          }
          return obj;
        }
        break;

      case 'PICK_LIST':
        {
          obj[i.tableColumn] = eval(`swapUserId('${i.type}')`);
          return obj;
        }
        break;
    }
  });

  let newerFieldMap = _.chain(fieldMap).sortBy('tableColumn').uniq();
};

/* Make header arrobj */
const makeHeaders = (h) => {
  DEBUG = true;
  const k = _.keys(h);
  const headerKeys = [];
  _.map(k, (o) => {
    const obj = {};
    obj['id'] = o;
    obj['title'] = o.toLowerCase();
    headerKeys.push(obj);
  });

  DEBUG ? console.log(headerKeys) : false;
  return headerKeys;
};

/* Parse uri looking for the string 'user' and returns the embedded id  */
const parseUserId = (objName) => {
  const str = objName;
  const searchUserString = 'rest/user/';
  let index = str.indexOf(searchUserString);
  let user = str.substring(index + searchUserString.length, str.length);
  return user;
};

/* Lookup old user id and return matching user id from new system */
const swapUserId = (uid) => {
  const ids = arr_users.filter((c) => c.lj_id == uid).map((c) => c.aap_id);

  if (ids[0]) return ids[0];
  return '06c836a659904b9c8b0419682f7d4728';
};

/* Write CVS  */
const writeCSVFile = (head, body) => {
  const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
  const csvStringifier = createCsvStringifier({
    header: head,
  });

  let h = csvStringifier.getHeaderString();
  let b = csvStringifier.stringifyRecords(body);

  return h + b;
};

/*  Create link to download */
const downloadFile = (csvFile) => {
  var filename = prompt('Enter file name', 'data.csv');
  var text = csvFile;

  var blob = new Blob([text], { type: 'text/plain' });
  var link = document.createElement('a');

  link.download = filename;
  link.innerHTML = 'Download File';

  link.href = window.URL.createObjectURL(blob);

  const action_div = document.getElementById('action_div');
  action_div.appendChild(link);

  return true;
};

//////////////////
//Do this stuff
function main() {
  const csvArray = makeCSVRecords(recordData);
  const headers = makeHeaders(recordData.platform.record[0]);
  //  const csvFile = writeCSVFile(headers,csvArray)
  //  const fileLinked = downloadFile(csvFile)
}

////////////////////////////////////////
//  Leave this alone from here down
////////////////////////////////////////

const previewFile = () => {
  let fileChosen;
  const content = document.querySelector('.content');
  const [file] = document.querySelector('input[type=file]').files;

  const reader = new FileReader();

  reader.addEventListener(
    'load',
    () => {
      // this will then display a text file
      // content.innerText = reader.result;
      fileChosen = reader.result;
      document.getElementById('json').innerHTML = fileChosen;
    },
    false
  );

  if (file) {
    reader.readAsText(file);
  }
  return fileChosen;
};

const showDiv = (el) => {
  var x = document.getElementById(el);
  if (x.style.display === 'none') {
    x.style.display = 'block';
  }
};

const hideDiv = (el) => {
  var x = document.getElementById(el);
  if (x.style.display === 'block') {
    x.style.display = 'none';
  }
};

const resType = document.getElementById('resource_type');
resType.addEventListener('change', function handleChange(event) {
  // console.log(event.target.value); // 👉️ get selected VALUE
  // 👇️ get selected VALUE even outside event handler
  let r = resType.options[resType.selectedIndex].value;
  // 👇️ get selected TEXT in or outside event handler
  // console.log(select.options[select.selectedIndex].text);

  if (r == 'record') showDiv('record_options_div');
  if (r != 'record') hideDiv('record_options_div');
});

const crudAction = document.getElementById('crud_action');
crudAction.addEventListener('change', function handleChange(event) {
  console.log(event.target.value); // 👉️ get selected VALUE

  //   // 👇️ get selected VALUE even outside event handler
  //   console.log(select.options[select.selectedIndex].value);

  //   // 👇️ get selected TEXT in or outside event handler
  //   console.log(select.options[select.selectedIndex].text);
});

const sendAction = document.getElementById('send_button');
sendAction.addEventListener('click', function handleChange(event) {
  console.log(resType.options[resType.selectedIndex].value);
  console.log(crudAction.options[crudAction.selectedIndex].value);
  main();
});

const file_reader = document.getElementById('file_reader');
file_reader.addEventListener('change', function handleChange(event) {
  const fc = previewFile();
});

///////////////////////////////////////////////////
// Scratch Pad
///////////////////////////////////
/*
const myArr = jsonData.platform.field;

const obj = {};

_.forEach(myArr, function (value, key) {
  switch (value.type) {
    case 'LOOKUP':
      {
        if (value.lookUpObjectId.content === 'USER') {
          console.log(value.title, value.lookUpObjectId.content);
          obj[value.tableColumn] =
            'swapUserId(' + value.tableColumn + '.content' + ')';
        } else {
          obj[value.tableColumn] = value.tableColumn + '.content';
        }

        return obj;
      }
      break;

    case value?.lookUpObjectId?.content === 'USER':
      {
        console.log(value?.lookUpObjectId?.content);

        return obj;
      }
      break;

    default: {
      obj[value.tableColumn] = 'n.' + value.tableColumn;
      return obj;
    }
  }
});

console.log(obj);

let theFunctionString = `console.log("Say hello to my little friend")`;

var func = new Function(theFunctionString);

func();
*/
