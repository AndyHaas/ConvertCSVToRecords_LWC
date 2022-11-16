import { LightningElement, track, api } from 'lwc';
import {
	FlowNavigationFinishEvent,
	FlowNavigationNextEvent
} from "lightning/flowSupport";
import getObjectFields from '@salesforce/apex/LwcConvertCSVToRecordsHelper.getObjectFields';
import { loadScript } from 'lightning/platformResourceLoader';
import PARSER from '@salesforce/resourceUrl/PapaParse';

export default class lwcConvertCSVToRecords extends LightningElement {
		// Initialize the parser
		parserInitialized = false;
		// Get flow attributes
		@api availableActions = [];

		// Set variables for the screen
		@track uploadFileName = '';
		@track uploadedFile = [];
		
		// Set objectName variable to be used in the getObjectFields Apex method
		@api objectName;
		
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
			if(event.detail.files.length > 0){
					const file = event.detail.files[0];
					this.loading = true;
					Papa.parse(file, {
							quoteChar: '"',
							header: true,
							skipEmptyLines: true,
							complete: (parsedResults) => {
									console.log('results: ' + JSON.stringify(parsedResults));

									// get the medta columns
									this.columnHeaders = parsedResults.meta.fields;
									console.log('columnHeaders: ' + JSON.stringify(this.columnHeaders));

									
									getObjectFields({objectName: this.objectName})
									.then(fieldList => {
											console.log('fieldList: ' + typeof fieldList);

											// Compare the column headers to the fields for the selected object
											// If the column header is not a match add __c to the end and recheck the fields
											// If the column header is still not a match, remove the column header from the list
											for (let i = 0; i < this.columnHeaders.length; i++) {
													let columnHeader = this.columnHeaders[i];
													console.log('columnHeader: ' + columnHeader);

													if (!fieldList.includes(columnHeader)) {
															columnHeader = columnHeader + '__c';
															console.log('custom field: ' + columnHeader);

															if (!fieldList.includes(columnHeader)) {
																	this.columnHeaders.splice(i, 1);
																	console.log('removed field: ' + columnHeader);
															}
													}
											}

											console.log('columnHeadersEdit: ' + JSON.stringify(this.columnHeaders));

											// New array to store the rows of data
											let newRows = [];
											// Go through the parsedResults object and set key based on the fieldList object
											// If the key is not in the columnHeaders object, remove the key from the object
											for (let i = 0; i < parsedResults.data.length; i++) {
													let row = parsedResults.data[i];
													console.log('row: ' + JSON.stringify(row));

													for (let key in row) {
															if (!this.columnHeaders.includes(key)) {
																	delete row[key];
															}
													}
													console.log('rowEdit: ' + JSON.stringify(row));
													newRows.push(row);
											}

											// Set the rows of data
											console.log('newRows: ' + JSON.stringify(newRows));
											this.outputValue = newRows;

											// for (let i = 0; i < fieldList.length; i++) {
											// 	// Check if the column header is a valid field name
											// 	if (fieldList[columnHeader] != undefined) {
											// 			console.log('standard field')
											// 			parsedResults[i].fieldName = fieldList[columnHeader];
											// 	} else {
											// 			// Add __c to the end of the key and recheck if it is a valid field name
											// 			parsedResults[i].fieldName = parsedResults[i].fieldName + '__c';
											// 			if (fieldList[parsedResults[i].fieldName] != undefined) {
											// 					console.log('custom field');
											// 					parsedResults[i].fieldName = fieldList[columnHeader];
											// 			} else {
											// 				// Remove the column header if it is not a valid field name
											// 				console.log('invalid field: ' + parsedResults);
											// 				parsedResults.splice(i, 1);
											// 			}
											// 	}
											// }
									})
									.catch(error => {
											console.log('error: ' + error);
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

		handleFileChange(event) {
				// Set const file
				const files = event.detail.files;

				// Set uploadFileStatus to uploaded
				this.uploadFileStatus = 'uploaded';

				// Get Object Field Names from APEX Class LwcConvertCSVTorecordsHelper
				this.objectInfo = getObjectFields({objectName: this.objectName})
				.then(result => {
						console.log('result: ' + result);

						// Set uploadFileStatus to processing - fields retrieved
						this.uploadFileStatus = 'processing - fields retrieved';

					if (files.length > 0) {
						const file = files[0];

						// Get the file name of the uploaded file
						this.uploadFileName = file.name;

						console.log('uploadFileName: ' + this.uploadFileName);
						
						// start reading the uploaded csv file
						this.read(file);
					}

				})
				.catch(error => {
						// Set error on uploadFileStatus
						this.uploadFileStatus = 'error: ' + error;
						console.log('error: ' + JSON.stringify(error));
				});
		}

		async read(file) {
				console.log('read');
				try {
					// Set uploadFileStatus to processing - file read
					this.uploadFileStatus = 'processing - file read';

					const result = await this.load(file);
					
					// execute the logic for parsing the uploaded csv file
					this.parse(result);
				} catch (e) {
					// Set error on uploadFileStatus
					this.uploadFileStatus = 'error: ' + e;
					console.log('error: ' + e);
				}
		}
		
		async load(file) {
			// Set uploadFileStatus to processing - file loaded
			this.uploadFileStatus = 'processing - file loaded';
			console.log('load');
			return new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => {
							resolve(reader.result);
					};
					reader.onerror = () => {
							reject(reader.error);
					};
					reader.readAsText(file);
			});
		}

		parse(csv) {
				console.log('parse');
				// Set uploadFileStatus to processing - file parsing
				this.uploadFileStatus = 'processing - file parsing';

				// parse the csv file and treat each line as one item of an array
				const lines = csv.split(/\r\n|\n/);
				
				// parse the first line containing the csv column headers
				const headers = lines[0].split(',');

				// iterate through csv headers and transform them to column format supported by the datatable
				this.columnHeaders = headers.map((header) => {
					return { label: header, fieldName: header };
				});
				// rename the column headers to match the field names of the object
				for (let i = 0; i < this.columnHeaders.length; i++) {
						// Remove double quotes from the column header
						let columnHeader = this.columnHeaders[i].label.replace(/"/g, '');
						// Check if the column header is a valid field name
						if (this.objectInfo[columnHeader] != undefined) {
								console.log('standard field')
								this.columnHeaders[i].fieldName = this.objectInfo[columnHeader];
						} else {
								// Add __c to the end of the field name and recheck if it is a valid field name
								this.columnHeaders[i].fieldName = this.columnHeaders[i].fieldName + '__c';
								if (this.objectInfo[this.columnHeaders[i].fieldName] != undefined) {
										console.log('custom field');
										this.columnHeaders[i].fieldName = this.objectInfo[columnHeader];
								} else {
									// Remove the column header if it is not a valid field name
									console.log('invalid field: ' + columnHeader);
									this.columnHeaders.splice(i, 1);
								}
						}
				}
			
				// Istanciate the rows array
				const data = [];
				
				// iterate through csv file rows and transform them to format
				lines.forEach((line, i) => {
					if (i === 0) return;
			
					const obj = {};
					const currentline = line.split(',');
			
					for (let j = 0; j < headers.length; j++) {
						var fieldValue = currentline[j]
						
						// Check if the field value is not null or undefined
						if (fieldValue != undefined && fieldValue != null) {
							fieldValue = fieldValue.replace(',"', ',').replace('",',',');
							fieldValue = fieldValue.trim();
							if(fieldValue.startsWith('\"')){
								fieldValue = fieldValue.substring(1,)
							}
							if(fieldValue.endsWith('\"')){
								fieldValue = fieldValue.substring(0,fieldValue.length-1)
							}
							fieldValue = fieldValue.replace('""', '"'); //according to spec "" stands for a single " within a column.

							// Check and make sure field value is not empty
							if (fieldValue != '' && fieldValue != undefined) {
								console.log('fieldValue: ' + fieldValue);
								obj[headers[j]] = fieldValue;
							}
						}
					}
			
					// Check if the object is not empty
					if (Object.keys(obj).length > 0) {
						data.push(obj);
					}
				});
				

				// assign the converted csv data for the lightning datatable
				this.rows = data;

				// Convert rows to string
				this.rowsRecords = JSON.stringify(this.rows);
				// Convert headers to string
				this.columnRecords = JSON.stringify(this.columnHeaders);

				// Set output value
				this.outputValue = this.rows;

				console.log('outputValue type: ' + typeof this.outputValue);
				console.log('outputValue: ' + this.outputValue);
				console.log('rows type: ' + typeof this.rows);

				// Show columns and rows
				console.log('columnHeaders: ' + JSON.stringify(this.columnHeaders));
				console.log('rows: ' + JSON.stringify(this.rows));

				// Set uploadFileStatus to processing - complete
				this.uploadFileStatus = 'processing - complete';

				// Auto navigate to the next screen
				this.handleNext();
			}

			// Handle auto navigation to the next screen/action
			handleNext() {
				if (this.availableActions.find((action) => action === "NEXT")) {
					const navigateNextEvent = new FlowNavigationNextEvent();
					this.dispatchEvent(navigateNextEvent);
				}
				else if (this.availableActions.find((action) => action === "FINISH")) {
					const navigateNextEvent = new FlowNavigationFinishEvent();
					this.dispatchEvent(navigateNextEvent);
				}
			}
}