// ==UserScript==
// @name                dict.cc-verbix
// @namespace	        https://github.com/todeit02/dict.cc_verbix_userscript
// @description	        Injects verb conjugation tables from Verbix on dict.cc
// @grant				GM.xmlHttpRequest
// @grant				GM_xmlhttpRequest
// @include				/^https:\/\/(?:(?:([a-z]){2}-?([a-z]){2})|(www))\.dict\.cc\/\?s=.*/
// @connect				api.verbix.com
// @connect 			raw.githubusercontent.com
// @require 			https://code.jquery.com/jquery-3.3.1.js
// ==/UserScript==

// choose correct function for Greasemonkey/Tampermonkey
if(typeof GM_xmlhttpRequest !== "function") GM_xmlhttpRequest = GM.xmlHttpRequest;

const tenseNamesUrl = "https://raw.githubusercontent.com/todeit02/dict.cc_verbix_userscript/master/tense_names.json";
const verbixApiUrl = "https://api.verbix.com/conjugator/html";
const verbixTableTemplateUrl = "http://tools.verbix.com/webverbix/personal/template.htm";

const dictWordButtonTableClass = "td7cml";
const dictWordTextTableDataClass = "td7nl";
const dictItemTableLineIdSuffix = "tr";
			
	
const verbixLanguageCodes = 
{
	"de": "deu",
	"en": "eng",
	"da": "dan",
	"es": "spa",
	"fi": "fin",
	"fr": "fra",
	"hu": "hun",
	"is": "isl",
	"it": "ita",
	"la": "lat",
	"nl": "nld",
	"no": "nob",
	"pt": "por",
	"ro": "ron",
	"sv": "swe"
};


const usingTemplateMoodTenses = 
[
	["Indicativo", "Presente"],
	["Indicativo", "Perfecto"],
	["Indicativo", "Imperfecto"],
	["Subjuntivo", "Presente"],
	["Imperativo", ""]
];


let languagePair = [];
let languagePairTenseNames = {};
let hoveredWordLink;
let openTooltips = [];
let verbixTenseTables = [];


$(function(){
	languagePair = getLanguagePair();
	loadLanguagePairTenseNames(languagePair);
	linkWordsToVerbix();
});


function linkWordsToVerbix()
{	  
  let dictItemTableLines = $("div[id='maincontent']").find("tr" + "[id^='" + dictItemTableLineIdSuffix + "']");
  let dictWordLinks = dictItemTableLines.find("a").filter(() => $(this).text().length > 0);
  
  dictWordLinks.hover(createTooltip, removeTooltip);
}


function createTooltip()
{
	hoveredWordLink = $(this);
	
	let wordText = hoveredWordLink.text();
	let isLeftColumn = hoveredWordLink.parent().prev().attr("class") === dictWordButtonTableClass;
	
	let dictLanguage = isLeftColumn ? languagePair[0] :  languagePair[1];
	let verbixLanguage = verbixLanguageCodes[dictLanguage];
	
	if(verbixLanguage == null) return;
	
	loadVerbixConjugationLists(verbixLanguage, wordText);
}


function showTooltip()
{		
	let tooltip = $("<br /><div></div>").insertAfter(hoveredWordLink);
	openTooltips.push(tooltip);
	
	verbixTenseTables.forEach(function(tenseTable, index){
		if(index > 0) tooltip.append("<br />");
		tooltip.append("<b>" + usingTemplateMoodTenses[index][1] + " (" + usingTemplateMoodTenses[index][0] + ")</b>");
		tooltip.append(tenseTable);
	});
	
	tooltip.css({
		"display": "inline-block",
		"opacity": "0",
		"text-align": "center",
		"padding": "5px 0",
		"border-radius": "6px",
		"position": "relative",
		"bottom": "125%"
	});
	tooltip.find("span").css("color", "black");
	tooltip.animate({"opacity": "1"}, 500);
}


function removeTooltip()
{
	openTooltips.forEach(function(tooltip){
		tooltip.remove();
	});
	openTooltips = [];
	verbixTenseTables = [];
}


function loadVerbixConjugationLists(language, verb)
{
	let getQuery = "language=" + language + "&tableurl=" + verbixTableTemplateUrl + "&verb=" + verb;
	let verbixUrl = verbixApiUrl + '?' + getQuery;
	
	GM_xmlhttpRequest({
		method: "GET",
		url: verbixUrl,
		onload: function(response) {
			let verbixContent = new DOMParser().parseFromString(response.responseText, "text/html");
			
			usingTemplateMoodTenses.forEach(function(moodTensePair)
			{
				const mood = moodTensePair[0];
				const tense = moodTensePair[1];
				let moodTables = $(".verbtense", verbixContent).filter(isTableOfMood(mood));

				if(moodTensePair[1] != null && moodTensePair.length > 0)
				{
					let tenseTable = moodTables.filter(isTableOfTense(tense));
					verbixTenseTables.push(tenseTable);
				}
				else
				{
					verbixTenseTables.push(moodTables);
				}
			});			
			showTooltip();
		}
	});
}


function getLanguagePair()
{
	let url = window.location.href;
	let subdomainRegex = /^https:\/\/(?:(?:([a-z]{2})-?([a-z]{2}))|(www))\.dict\.cc\/\?s=.*/;
	let subdomain = subdomainRegex.exec(url);
	
	if(subdomain[3]) return ["en", "de"];
	if((subdomain[1] === "de" && subdomain[2] === "en") || (subdomain[2] === "de" && subdomain[1] === "en"))
	{
		return ["en", "de"];
	}
	
	const isGermanWithoutEnglish = (subdomain[1] === "de" || subdomain[2] === "de");
	const isEnglishWithoutGerman = (subdomain[1] === "en" || subdomain[2] === "en");	
	let languages = [];
	
	if(isGermanWithoutEnglish)
	{
		if(subdomain[1] === "de") languages.push(subdomain[2]);
		else languages.push(subdomain[1]);
		
		languages.push("de");
	}
	if(isEnglishWithoutGerman)
	{
		if(subdomain[1] === "en") languages.push(subdomain[2]);
		else languages.push(subdomain[1]);
		
		languages.push("en");
	}
	return languages;
}


function loadLanguagePairTenseNames(languagePair)
{
	$.getJSON(tenseNamesUrl, data => {
		let defaultTenseNames = data["es"];
		
		languagePair.forEach(function(language)
		{
			if(data[language]) languagePairTenseNames[language] = data[language];
			else languagePairTenseNames[language] = defaultTenseNames;
		});
	});
}


function isTableOfMood(templateMoodName)
{
	return function()
	{
		const $moodTableDataInMain = $(this).parents("td").eq(1);
		const $moodTableRowInMain = $moodTableDataInMain.parent();
		const $mainTable = $moodTableRowInMain.parents("table").first();
		const moodColIndexInMain = $moodTableDataInMain.index();
		const moodRowIndexInMain = $moodTableRowInMain.index();
		const heading = $("tr", $mainTable).eq(moodRowIndexInMain - 1).children().eq(moodColIndexInMain).text();

		return (heading === templateMoodName);
	}
}
	

function isTableOfTense(templateTenseName)
{
	return function()
	{
		let parentText = $(this).parent().text();		
		while(parentText.charAt(0) === '\r' || parentText.charAt(0) === '\n')
		{
			parentText = parentText.substr(1);
		}		
		return parentText.substring(0, templateTenseName.length) === templateTenseName;
	};
}