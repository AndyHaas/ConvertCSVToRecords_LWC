import { LightningElement, track, api } from 'lwc';
import {
	FlowNavigationFinishEvent,
	FlowNavigationNextEvent
} from "lightning/flowSupport";
import getObjectFields from '@salesforce/apex/LwcConvertCSVToRecordsHelper.getObjectFields';
import getFieldType from '@salesforce/apex/LwcConvertCSVToRecordsHelper.getFieldType';
import { loadScript } from 'lightning/platformResourceLoader';
import PARSER from '@salesforce/resourceUrl/PapaParse';

export default class lwcConvertCSVToRecords extends LightningElement {
		// Initialize the parser
		parserInitialized = false;

		// PapaParser Inputs
		@api delimiter = ',';
		@api newline = '';
		@api quoteChar = '"';
		@api escapeChar = '"';
		@api transformHeader = undefined;
		@api header = false;
		@api dynamicTyping = false;
		@api encoding = '';
		@api comments = false;
		@api fastMode = false;
		@api skipEmptyLines = false;
		@api transform = undefined;
		@api delimitersToGuess = [];

		// Get Label for Input file
		@api inputLabel = 'Upload CSV';

		// Get flow attributes
		@api availableActions = [];
		@api autoNavigateNext = false;

		// Set variables for the screen
		@track uploadFileName = '';
		@track uploadedFile = [];
		
		// Set objectName variable to be used in the getObjectFields Apex method
		@api objectName = 'Account';
		
		// Store the fileName of the uploaded CSV file
		@track fileName = '';

		// Store the fields for the selected object
		@track objectInfo = [];

		// Store Column Headers
		@track columnHeaders = [];

		// Store Rows of Data
		@track rows = [];

		// Store the output SObject records from the CSV file
		@api outputValue;

		// Store a Status field to show the user the status of the CSV file
		@track uploadFileStatus = '';

		@track _customField;
		@track _standardField;

		// Initialize the parser
		renderedCallback() {
			if(!this.parserInitialized){
					loadScript(this, PARSER)
							.then(() => {
									this.parserInitialized = true;
							})
							.catch(error => console.error(error));
			}
		}

		handleInputChange(event){
			// Set Defualt Values
			this.header = true;
			this.skipEmptyLines = true;
			
			if(event.detail.files.length > 0){
					const file = event.detail.files[0];
					this.loading = true;
					Papa.parse(file, {
							// quoteChar: '"',
							// header: true,
							// skipEmptyLines: true,
							delimiter: this.delimiter,
							newline: this.newline,
							quoteChar: this.quoteChar,
							escapeChar: this.escapeChar,
							transformHeader: this.transformHeader,
							header: this.header,
							dynamicTyping: this.dynamicTyping,
							encoding: this.encoding,
							comments: this.comments,
							fastMode: this.fastMode,
							skipEmptyLines: this.skipEmptyLines,
							transform: this.transform,
							delimitersToGuess: this.delimitersToGuess,
							complete: (parsedResults) => {
									console.log('results: ' + JSON.stringify(parsedResults));

									// get the medta columns
									this.columnHeaders = parsedResults.meta.fields;
									console.log('columnHeaders: ' + JSON.stringify(this.columnHeaders));

									console.log('objectName: ' + this.objectName);
									
									getObjectFields({objectName: this.objectName})
									.then(fieldList => {
											console.log('fieldList: ' + fieldList);

											// Set new columnHeader array
											let newColumnHeaders = [];
											// Compare the column headers to the fields for the selected object
											// If the column header is not a match add __c to the end and recheck the fields
											// If the column header is still not a match, remove the column header from the list
											for (let i = 0; i < this.columnHeaders.length; i++) {
												let columnHeader = this.columnHeaders[i];

												// Trim the column header
												columnHeader = columnHeader.trim();
												console.log('columnHeader: ' + columnHeader);
												// For standard fields we need to remove the space inbetween the words
												// For example: Account Name becomes AccountName
												// Create standardField variable to store the new value
												this._standardField = '';
												if (this._standardField.includes(' ')) {
													console.log('standard field contains space');
													this._standardField = columnHeader.split(' ').join('_');
												} else {
													this._standardField = columnHeader;
												}
												console.log('standardField: ' + this._standardField);
												if (fieldList.includes(this._standardField)) {
													console.log('standardField: ' + this._standardField + ' is a match');
													// Add the column header to the newColumnHeaders array
													newColumnHeaders.push({"newField":this._standardField, "oldField":columnHeader});
												} else { 
													// Create customField variable to store the new value
													this._customField = '';
													// Remove special characters from the column header
													//customField = columnHeader.replace(/!/g, '').replace(/@/g, '').replace(/#/g, '').replace(/\$/g, '').replace(/%/g, '').replace(/\^/g, '').replace(/&/g, '').replace(/\*/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/-/g, '').replace(/\+/g, '').replace(/=/g, '').replace(/\[/g, '').replace(/\]/g, '').replace(/\{/g, '').replace(/\}/g, '').replace(/\|/g, '').replace(/\\/g, '').replace(/:/g, '').replace(/;/g, '').replace(/"/g, '').replace(/'/g, '').replace(/</g, '').replace(/>/g, '').replace(/,/g, '').replace(/\./g, '').replace(/\?/g, '').replace(/\//g, '').replace(/`/g, '').replace(/~/g, '');
													// Replace spaces with underscores
													this._customField = columnHeader.split(' ').join('_');
													// Add __c to the end of the field
													this._customField = this._customField + '__c';
													console.log('custom field: ' + this._customField);
													if (fieldList.includes(this._customField)) {
														console.log('customField: ' + this._customField + ' is a match');
														newColumnHeaders.push({"newField":this._customField, "oldField":columnHeader});
													} else {
														console.log('removed field: ' + columnHeader);
													}
												}
											}

											console.log('newColumnHeaders: ' + JSON.stringify(newColumnHeaders));

											// New array to store the rows of data
											let newRows = [];
											// Go through the parsedResults object and set key based on the fieldList object match on oldField and replace the oldField with the newField
											// If the key is not in the columnHeaders object, remove the key from the object
											for(let i = 0; i < parsedResults.data.length; i++){
												let row = parsedResults.data[i];
												let newRow = {};
												for(let key in row){
													let newKey = key;
													for(let j = 0; j < newColumnHeaders.length; j++){
														// Set new key to newField if oldField matches
														if(key === newColumnHeaders[j].oldField){
															newKey = newColumnHeaders[j].newField;
														}
														// If the key is not in the columnHeaders object, remove the key from the object
														// if(!newColumnHeaders.includes(key)){
														// 	delete row[key];
														// }
														// Convert the value to the correct data type from getFieldType
														// console.log('key: ' + key + ' newKey: ' + newKey + ' value: ' + row[key] + ' type: ' + getFieldType(this.objectName, newKey));
														// if(getFieldType(this.objectName, newKey) === 'BOOLEAN'){
														// 	// Convert the value to a boolean
														// 	row[key] = row[key] === 'true' ? true : false;
														// } else if(getFieldType(this.objectName, newKey) === 'DATE'){
														// 	// Convert the value to a date
														// 	row[key] = new Date(row[key]);
														// } else if(getFieldType(this.objectName, newKey) === 'DATETIME'){
														// 	// Convert the value to a datetime
														// 	row[key] = new Date(row[key]);
														// } else if(getFieldType(this.objectName, newKey) === 'NUMBER'){
														// 	// Convert the value to a double
														// 	row[key] = parseFloat(row[key]);
														// } else if(getFieldType(this.objectName, newKey) === 'INTEGER'){
														// 	// Convert the value to an int
														// 	row[key] = parseInt(row[key]);
														// } else {
														// 	// Default to string
														// 	row[key] = row[key];
														// }

													}
													newRow[newKey] = row[key];
												}
												newRows.push(newRow);
											}

											// Set the rows of data
											console.log('newRows: ' + JSON.stringify(newRows));
											this.outputValue = newRows;

											console.log('autoNavigateNext: ' + this.autoNavigateNext);
											// If the autoNavigateNext attribute is true, navigate to the next screen
											if (this.autoNavigateNext) {
												console.log('autoNavigateNext');
												this.handleNext();
											}
									})
									.catch(error => {
											console.log('error: ' + JSON.stringify(error.message));
									});

									// Set outputValue to the results
									this.outputValue = results;
							},
							error: (error) => {
									console.error(error);
									this.loading = false;
							}
					})
			}
		}

		// Handle auto navigation to the next screen/action
		handleNext() {
			if (this.availableActions.find((action) => action === "NEXT")) {
				const navigateNextEvent = new FlowNavigationNextEvent();
				this.dispatchEvent(navigateNextEvent);
			}
			if (this.availableActions.find((action) => action === "FINISH")) {
				const navigateNextEvent = new FlowNavigationFinishEvent();
				this.dispatchEvent(navigateNextEvent);
			}
		}
}