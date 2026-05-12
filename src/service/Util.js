import { XMLBuilder, XMLParser } from 'fast-xml-parser';

// methode pour verifier url 
export const urlContains = (pathname, value) => {
  return pathname.includes(value);
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export const xmlToJson = (xml) => {
  return parser.parse(xml);
};

export const jsonToXml = (jsonObj) => {
  return builder.build(jsonObj);
};
