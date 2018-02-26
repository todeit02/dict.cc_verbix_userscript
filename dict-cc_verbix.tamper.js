// ==UserScript==
// @name                dict.cc-verbix
// @namespace	        https://github.com/todeit02/dict.cc_verbix_userscript
// @description	        Injects verb conjugation tables from Verbix on dict.cc
// @grant				GM_xmlhttpRequest
// @include				/^https:\/\/(?:(?:([a-z]){2}-?([a-z]){2})|(www))\.dict\.cc\/\?s=.*/
// @connect				api.verbix.com
// @require 			https://code.jquery.com/jquery-3.3.1.js
// ==/UserScript==

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
	"ru": "rus",
	"sv": "swe",
	"tr": "tur"
};

const usingTemplateTenses = 
[
	"Presente",
	"Perfecto",
	"Imperfecto"
];

	var languagePair;
	var hoveredWordLink;
	var openTooltips = [];
	var verbixTenseTables = [];

$(function(){
	languagePair = getLanguagePair();
	linkWordsToVerbix();
});

function linkWordsToVerbix()
{	  
  var dictItemTableLines = $("div[id='maincontent']").find("tr" + "[id^='" + dictItemTableLineIdSuffix + "']");
  var dictWordLinks = dictItemTableLines.find("a").filter(function(){ return $(this).text().length > 0; });
  
  dictWordLinks.hover(createTooltip, removeTooltip);
}

function createTooltip()
{
	hoveredWordLink = $(this);
	
	var wordText = hoveredWordLink.text();
	var isLeftColumn = hoveredWordLink.parent().prev().attr("class") === dictWordButtonTableClass;
	
	var dictLanguage = isLeftColumn ? languagePair[0] :  languagePair[1];
	var verbixLanguage = verbixLanguageCodes[dictLanguage];
	
	if(verbixLanguage == null) return;
	
	loadVerbixConjugationLists(verbixLanguage, wordText);
}

function showTooltip()
{		
	console.log("Show verbix tooltip.");
	var tooltip = $("<br /><div></div>").insertAfter(hoveredWordLink);
	openTooltips.push(tooltip);
	
	verbixTenseTables.forEach(function(tenseTable, index){
		if(index > 0) tooltip.append("<br />");
		tooltip.append("<b>" + usingTemplateTenses[index] + "</b>");
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
	const verbixApiUrl = "https://api.verbix.com/conjugator/html";
	const verbixTableTemplateUrl = "http://tools.verbix.com/webverbix/personal/template.htm";
	
	var postLanguageArgument = verbixLanguageCodes[language];
	var postData = "language=" + language + "&tableurl=" + verbixTableTemplateUrl + "&verb=" + verb;
	var verbixUrl = verbixApiUrl + '?' + postData;
	
	GM_xmlhttpRequest({
		method: "GET",
		url: verbixUrl,
		onload: function(response) {
			var verbixContent = new DOMParser().parseFromString(response.responseText, "text/html");
			
			usingTemplateTenses.forEach(function(tenseName)
			{
				var tenseTable = $(".verbtense", verbixContent).filter(isTableOfTense(tenseName)).first();
				verbixTenseTables.push(tenseTable);
			});			
			showTooltip();
		}
	});
}

function getLanguagePair()
{
	var url = window.location.href;
	var subdomainRegex = /^https:\/\/(?:(?:([a-z]{2})-?([a-z]{2}))|(www))\.dict\.cc\/\?s=.*/;
	var subdomain = subdomainRegex.exec(url);
	
	if(subdomain[3]) return ["en", "de"];
	if((subdomain[1] === "de" && subdomain[2] === "en") || (subdomain[2] === "de" && subdomain[1] === "en"))
	{
		return ["en", "de"];
	}
	
	isGermanWithoutEnglish = (subdomain[1] === "de" || subdomain[2] === "de");
	isEnglishWithoutGerman = (subdomain[1] === "en" || subdomain[2] === "en");	
	var languages = [];
	
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
	
function isTableOfTense(templateTenseName)
{
	return function()
	{
		var parentText = $(this).parent().text();		
		while(parentText.charAt(0) === '\r' || parentText.charAt(0) === '\n')
		{
			parentText = parentText.substr(1);
		}		
		return parentText.substring(0, templateTenseName.length) === templateTenseName;
	};
}