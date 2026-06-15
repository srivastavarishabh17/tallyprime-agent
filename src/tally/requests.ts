export function escapeXML(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function getCompanyListXML() {
  return `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>List of Companies</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVIsSimpleCompany>No</SVIsSimpleCompany>
   </STATICVARIABLES>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

export function getLedgersXML() {
  return `
<ENVELOPE>
 <HEADER>
   <VERSION>1</VERSION>
   <TALLYREQUEST>Export</TALLYREQUEST>
   <TYPE>Collection</TYPE>
   <ID>List of Ledgers</ID>
 </HEADER>
 <BODY>
   <DESC>
     <STATICVARIABLES>
       <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
     </STATICVARIABLES>
   </DESC>
 </BODY>
</ENVELOPE>`;
}
