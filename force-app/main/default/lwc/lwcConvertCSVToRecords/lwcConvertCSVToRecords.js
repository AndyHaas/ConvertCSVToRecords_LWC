import { LightningElement, track, api } from 'lwc';
import {
	FlowNavigationFinishEvent,
	FlowNavigationNextEvent,
	FlowAttributeChangeEvent
} from "lightning/flowSupport";
import getObjectFields from '@salesforce/apex/LwcConvertCSVToRecordsHelper.getObjectFields';
import { loadScript } from 'lightning/platformResourceLoader';
import PARSER from '@salesforce/resourceUrl/PapaParse';

export default class lwcConvertCSVToRecords extends LightningElement {
		// Initialize the parser
		parserInitialized = false;

		// PapaParser Inputs
		@api get delimiter() {
			return this._delimiter;
		}
		set delimiter(value) {
			this._delimiter = value;
		}
		_delimiter = ',';

		@api get newline() {
			return this._newline;
		}
		set newline(value) {
			this._newline = value;
		}
		_newline = '';
		
		@api get quoteChar() {
			return this._quoteChar;
		}
		set quoteChar(value) {
			this._quoteChar = value;
		}
		_quoteChar = '"';
		
		@api get escapeChar() {
			return this._escapeChar;
		}
		set escapeChar(value) {
			this._escapeChar = value;
		}
		_escapeChar = '"';

		@api get transformHeader() {
			return this._transformHeader;
		}
		set transformHeader(value) {
			this._transformHeader = value;
		}
		_transformHeader = undefined;
		
		@api get header() {
			return this._header;
		}
		set header(value) {
			this._header = value;
		}
		_header = false;
		
		@api get dynamicTyping() {
			return this._dynamicTyping;
		}
		set dynamicTyping(value) {
			this._dynamicTyping = value;
		}
		_dynamicTyping = false;
		
		@api get encoding() {
			return this._encoding;
		}
		set encoding(value) {
			this._encoding = value;
		}
		_encoding = '';
		
		@api get comments() {
			return this._comments;
		}
		set comments(value) {
			this._comments = value;
		}
		_comments = false;
		
		@api get fastMode() {
			return this._fastMode;
		}
		set fastMode(value) {
			this._fastMode = value;
		}
		_fastMode = false;
		
		@api get skipEmptyLines() {
			return this._skipEmptyLines;
		}
		set skipEmptyLines(value) {
			this._skipEmptyLines = value;
		}
		_skipEmptyLines = false;
		
		@api get transform() {
			return this._transform;
		}
		set transform(value) {
			this._transform = value;
		}
		_transform = undefined;
		
		@api get delimitersToGuess() {
			return this._delimitersToGuess;
		}
		set delimiterToGuess(value) {
			this._delimitersToGuess = value;
		}
		_delimitersToGuess = [];

		// Get Label for Input file
		@api get inputLabel() {
			return this._inputLabel;
		}
		set inputLabel(value) {
			this._inputLabel = value;
		}
		_inputLabel = 'Upload CSV';

		// Get flow attributes
		@api get availableActions() {
			return this._availableActions;
		}
		set availableActions(value) {
			this._availableActions = value;
		}
		_availableActions = [];

		@api get autoNavigateNext() {
			return this._autoNavigateNext;
		}
		set autoNavigateNext(value) {
			this._autoNavigateNext = value;
		}
		_autoNavigateNext = false;
		
		// Set variables for the screen
		@track uploadFileName = '';
		@track uploadedFile = [];
		
		// Set objectName variable to be used in the getObjectFields Apex method
		@api objectName = 'Account';

		// Set the isError variable to false
		@api get isError() {
			return this._isError;
		}
		set isError(value) {
			this._isError = value;
		}
		_isError = false;

		// Set the errorMessage variable to an null 
		@api get errorMessage() {
			return this._errorMessage;
		}
		set errorMessage(value) {
			this._errorMessage = value;
		}
		_errorMessage = null;
		
		// Store the fileName of the uploaded CSV file
		@track fileName = '';

		// Store the fields for the selected object
		@track objectInfo = [];

		// Store Column Headers
		@track columnHeaders = [];

		// Store Rows of Data
		@track rows = [];

		// Store the output SObject records from the CSV file
		@api get outputValue() {
			return this._outputValue;
		}
		set outputValue(value) {
			this._outputValue = value;
		}
		_outputValue = [];

		// Store a Status field to show the user the status of the CSV file
		@track uploadFileStatus = '';

		// Set isLoading to false
		@api get isLoading() {
			return this._isLoading;
		}
		set isLoading(value) {
			this._isLoading = value;
		}
		_isLoading = false;


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
					this.isLoading = true;
					const file = event.detail.files[0];
					this.loading = true;
					Papa.parse(file, {
							delimiter: this._delimiter,
							newline: this._newline,
							quoteChar: this._quoteChar,
							escapeChar: this._escapeChar,
							transformHeader: this._transformHeader,
							header: this._header,
							dynamicTyping: this._dynamicTyping,
							encoding: this._encoding,
							comments: this._comments,
							fastMode: this._fastMode,
							skipEmptyLines: this._skipEmptyLines,
							transform: this._transform,
							delimitersToGuess: this._delimitersToGuess,
							complete: (parsedResults) => {
									console.log('results: ' + JSON.stringify(parsedResults));

									// get the medta columns
									this._columnHeaders = parsedResults.meta.fields;
									console.log('columnHeaders: ' + JSON.stringify(this._columnHeaders));

									console.log('objectName: ' + this.objectName);
									
									getObjectFields({objectName: this.objectName})
									.then(fieldList => {
											console.log('fieldList: ' + typeof fieldList);

											// Set new columnHeader array
											let newColumnHeaders = [];

											// Set array of fields to remove
											let fieldsToRemove = [];

											// Compare the column headers to the fields for the selected object
											// If the column header is not a match add __c to the end and recheck the fields
											// If the column header is still not a match, remove the column header from the list
											for (let i = 0; i < this._columnHeaders.length; i++) {
												let columnHeader = this._columnHeaders[i];

												// Trim the column header
												columnHeader = columnHeader.trim();

												console.log('columnHeader: ' + columnHeader);

												// For standard fields we need to remove the space inbetween the words
												// For example: Account Name becomes AccountName
												// Create standardField variable to store the new value
												let standardField;
												if (columnHeader.includes(' ')) {
													standardField = columnHeader.replaceAll(' ', '');
												} else {
													standardField = columnHeader;
												}
												if (fieldList.includes(standardField)) {
													console.log('standard field: ' + columnHeader);
													newColumnHeaders.push({"newField":columnHeader, "oldField":columnHeader});
												} else {
												
													// Create customField variable to store the new value
													let customField;

													// Replace spaces with underscores
													customField = columnHeader.replaceAll(' ', '_');

													// Limit the length of the field to 40 characters
													customField = customField.substring(0, 40);

													// If the field starts with a number, add an X to the beginning of the field
													if (customField.match(/^[0-9]/)) {
														customField = 'X' + customField;
													}

													// Remove any special characters
													// % & * ( ) + - = { } [ ] : ; ' " , . < > ? / | \ ~ ` ! @ # $ ^
													customField = customField.replace(/[^a-zA-Z0-9_]/g, '');

													// newlines and carriage returns are also removed
													customField = customField.replace(/[\r\n]+/gm, '');

													// Remove any leading or trailing underscores
													customField = customField.replace(/^_+|_+$/g, '');

													// Replace any double underscores with a single underscore
													customField = customField.replace(/__+/g, '_');

													// Replace any triple underscores with a single underscore
													customField = customField.replace(/___+/g, '_');

													// Add __c to the end of the field
													customField = customField + '__c';

													// Validate the field name
													if (fieldList.includes(customField)) {
														console.log('custom field: ' + customField);
														newColumnHeaders.push({"newField":customField, "oldField":columnHeader});
													} else {
														console.log('removed field: ' + columnHeader);
														fieldsToRemove.push(columnHeader);
													}
												}
											}

											console.log('newColumnHeaders: ' + JSON.stringify(newColumnHeaders));
											console.log('fieldsToRemove: ' + JSON.stringify(fieldsToRemove));

											// If fieldsToRemove is not empty then error out
											if (fieldsToRemove.length > 0) {
												console.log('fieldsToRemove: ' + JSON.stringify(fieldsToRemove));
												this._errorMessage = 'The following fields are not valid: ' + fieldsToRemove.join(', ') + '. Please remove them from the CSV file and try again.';
												this._isError = true;
											}

											// Check if there are duplicate headers
											let duplicateHeaders = [];
											for (let i = 0; i < newColumnHeaders.length; i++) {
												let columnHeader = newColumnHeaders[i].newField;
												if (newColumnHeaders.filter(x => x.newField === columnHeader).length > 1) {
													duplicateHeaders.push(columnHeader);
												}
											}

											// If there is a duplicate header then error out
											if (duplicateHeaders.length > 0) {
												console.log('duplicateHeaders: ' + JSON.stringify(duplicateHeaders));
												this._errorMessage = 'Duplicate headers found: ' + duplicateHeaders.join(', ') + '. Please remove the duplicate headers and try again.';
												this._isError = true;
												this._isLoading = false;
												return;
											}

											// New array to store the rows of data
											let newRows = [];
											// Go through the parsedResults.data object and set key based on the fieldList object match on oldField and replace the oldField with the newField
											// If the key is not in the columnHeaders object, remove the key and value from the object
											// If the key is in the fieldsToRemove object, remove the key and value from the object
											console.log('parsedResults.length: ' + parsedResults.data.length);
											for (let i = 0; i < parsedResults.data.length; i++) {
												let row = parsedResults.data[i];
												let newRow = {};
												for (let key in row) {
													if (row.hasOwnProperty(key)) {
														let newKey = key;
														let newValue = row[key];
														for (let j = 0; j < newColumnHeaders.length; j++) {
															if (key === newColumnHeaders[j].oldField) {
																console.log('oldKey: ' + key + ' newKey: ' + newColumnHeaders[j].newField);
																newKey = newColumnHeaders[j].newField;
															}
														}
														if (fieldsToRemove.includes(key)) {
															console.log('removed key: ' + key);
															delete row[key];
														} else {
															console.log('newRow[' + newKey + ']: ' + newValue);
															newRow[newKey] = newValue;
														}
													}
												}
												newRows.push(newRow);
											}
											
											// Set the rows of data
											console.log('newRows: ' + JSON.stringify(newRows));
											this._outputValue = newRows;
											this._isLoading = false;

											console.log('autoNavigateNext: ' + this._autoNavigateNext);
											// If the autoNavigateNext attribute is true, navigate to the next screen
											if (this._autoNavigateNext) {
												console.log('autoNavigateNext');
												this.handleNext();
											}
									})
									.catch(error => {
											console.log('error: ' + JSON.stringify(error));
											this._errorMessage = JSON.stringify(error);
											this._isError = true;
											this._isLoading = false;
									});

									// Set outputValue to the results
									this.handleEventChanges('outputValue', results);
							},
							error: (error) => {
									console.error(error);
									this._errorMessage = error;
									this._isError = true;
									this._isLoading = false;
							}
					})
			}
		}

		// Handle auto navigation to the next screen/action
		handleNext() {
			if (this._availableActions.find((action) => action === "NEXT")) {
				const navigateNextEvent = new FlowNavigationNextEvent();
				this.dispatchEvent(navigateNextEvent);
			}
			if (this._availableActions.find((action) => action === "FINISH")) {
				const navigateNextEvent = new FlowNavigationFinishEvent();
				this.dispatchEvent(navigateNextEvent);
			}
		}

		handleEventChanges(apiName, value) {
            const attributeChangeEvent = new FlowAttributeChangeEvent(apiName, value);
            this.dispatchEvent(attributeChangeEvent);
        }
}