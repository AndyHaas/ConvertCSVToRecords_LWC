@isTest()
public with sharing class LwcConvertCSVToRecordsHelper_Test {

    static testMethod void getObjectFieldsTest() {
        List<String> fields = LwcConvertCSVToRecordsHelper.getObjectFields('Account');
        System.assertEquals('Id', fields[0]);
     }

    static testMethod void getFieldTypeTest(){
        String fields = LwcConvertCSVToRecordsHelper.getFieldType('Account', 'Name');
        System.assertEquals('STRING', fields);
    
    }
}