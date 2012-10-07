/*

   Copyright 2012 Rustici Software, LLC

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/

var TINCAN = (TINCAN || {});

TINCAN.Viewer = function(){ 
	this.includeRawData = true;
    this.tcDriver = null;
    this.tcapiVersion = "all";
    this.allVersions = ["0.9", "0.95"];
    this.multiVersionStream = null;
};


if (typeof console !== "undefined") {
    TINCAN.Viewer.prototype.log = function (str) {
        console.log(str);
    };
}
else {
    TINCAN.Viewer.prototype.log = function (str) {};
}

TINCAN.Viewer.prototype.getCallback = function(callback){
	var tcViewer = this;
	return function(){ callback.apply(tcViewer, arguments); };
};

TINCAN.Viewer.prototype.copyObject = function(obj){
    if(obj == null){
        return null;
    }
    var newObj = {}, key;
    for(key in obj){
        if(obj.hasOwnProperty(key)){
            newObj[key] = obj[key];
        }
    }
    return newObj;
};


TINCAN.Viewer.prototype.getDriver = function(){
    if (this.tcDriver === null) {
        this.tcDriver = TCDriver_ConfigObject();
        TCDriver_AddRecordStore(
            this.tcDriver,
            {
                endpoint: Config.endpoint,
                auth: 'Basic ' + Base64.encode(Config.authUser + ':' + Config.authPassword)
            }
        );
    }
    return this.tcDriver;
};

TINCAN.Viewer.prototype.getMultiVersionStream = function(versionList){
    var lrs = this.getDriver().recordStores[0], 
        lrsList = [], 
        i, 
        lrsCopy;

    for(i = 0; i < versionList.length; i++){
        lrsCopy = this.copyObject(lrs);
        lrsCopy.version = versionList[i];
        lrsList.push(lrsCopy);
    }
    return new TINCAN.MultiLrsStatementStream(lrsList);
};


TINCAN.Viewer.prototype.TinCanSearchHelper = function(){
	this.getActor = function(){
		var actor = null;
		var actorJson = this.getSearchVar("actorJson");
		var actorEmail = this.getSearchVar("actorEmail");
		var actorAccount = this.getSearchVar("actorAccount");
		
		if(actorJson != null && actorJson.length > 0){
			actor = JSON.parse(actorJson);
		} 
		else {
			if(actorEmail != null){
				actor = (actor == null) ? new Object() : actor;
				if(actorEmail.indexOf('mailto:') == -1){
					actorEmail = 'mailto:'+actorEmail;
				}
				actor["mbox"] = [actorEmail];
			}
			
			if(actorAccount != null){
				actor = (actor == null) ? new Object() : actor;
				var accountParts = actorAccount.split("::");
				actor["account"] = [{"accountServiceHomePage":accountParts[0], "accountName":accountParts[1]}];
			}
		}
		return actor;
	};
	
	this.getVerb = function(){
		return this.getSearchVar("verb");
	};
	
	this.getObject = function(){
		var obj = null;
		var objectJson = this.getSearchVar("objectJson");
		if(objectJson != null){
			obj = JSON.parse(objectJson);
		} else {
			var activityId = this.getSearchVar("activityId");
			if(activityId != null){
				obj = {"id":activityId};
			}
		}
		return obj;
	};
	
	this.getRegistration = function(){
		return this.getSearchVar("registration");
	};
	
	this.getContext = function(){
		return this.getSearchVarAsBoolean("context", "false");
	};
	
	this.getSince = function(){
		var since = this.getSearchVar("since");
		if(since != null && !this.dateStrIncludesTimeZone(since)){
			since = since + "Z";
		}
		return since;
	};
	
	this.getUntil = function(){
		var until = this.getSearchVar("until");
		if(until != null && !this.dateStrIncludesTimeZone(until)){
			until = until + "Z";
		}
		return until;
	};
	
	this.getAuthoritative = function(){
		return this.getSearchVarAsBoolean("authoritative", "true");
	};
	
	this.getSparse = function(){
		return this.getSearchVarAsBoolean("sparse", "false");
	};
	
	this.getInstructor = function(){
		var instructorJson = this.getSearchVar("instructorJson");
		if(instructorJson != null){
			return JSON.parse(instructorJson);
		};
		return null;
	};

    this.getVersion = function(){
        return this.getSearchVar("version");
    };
	
	this.dateStrIncludesTimeZone = function(str){
		return str != null && (str.indexOf("+") >= 0 || str.indexOf("Z") >= 0); 
	};
	
	this.nonEmptyStringOrNull = function(str){
		return (str != null && str.length > 0) ? str : null;
	};
	
	this.getSearchVar = function(searchVarName, defaultVal){
		var myVar = $("#"+searchVarName).val();
		if(myVar == null || myVar.length < 1){
			return defaultVal;
		}
		return myVar;
	};
	
	this.getSearchVarAsBoolean = function(searchVarName, defaultVal){
		return $("#"+searchVarName).is(":checked");
	};
};


TINCAN.Viewer.prototype.TinCanFormHelper = function(){
	this.copyQueryStringToForm = function(){
		var booleanVals = ["context", "authoritative", "sparse"];
		var qsMap = this.getQueryStringMap();
		for(var key in qsMap){
			var inputType = ($.inArray(key, booleanVals) >= 0) ? "checkbox" : "text";
			this.setInputFromQueryString(key, qsMap[key], inputType);
		}
	};
	
	this.setInputFromQueryString = function(name, val, inputType){
		if(inputType == null){
			inputType = "text";
		}
		if(val != null){
			if(inputType == "text"){
				$("#"+name).val(val);
			}
			else if (inputType == "checkbox"){
				if(val == "true"){
					$("#"+name).attr('checked', 'checked');
				} else {
					$("#"+name).removeAttr('checked');
				}
			}
		};
	};
	
	this.getQueryStringMap = function(){
		var qs = window.location.search;
		if(qs == null || qs.length < 1){
			return [];
		}
		if(qs.indexOf("#") > 0){
			qs = qs.substring(0, qs.indexOf("#"));
		}
		qs = qs.substring(1, qs.length);
		var nameVals = qs.split("&");
		var qsMap = {};
		for(var i = 0; i < nameVals.length; i++){
			var keyVal = nameVals[i].split("=");
			qsMap[keyVal[0]] = decodeURIComponent(keyVal[1].replace(/\+/g, " "));
		}
		return qsMap;
	};
};


TINCAN.Viewer.prototype.searchStatements = function(){
    var versionsToUse;
	var helper = new this.TinCanSearchHelper(); 
	var queryObj = new TINCAN.StatementQueryObject();

	queryObj.actor = helper.getActor();
	queryObj.verb = helper.getVerb();
	queryObj.object = helper.getObject();
	queryObj.registration = helper.getRegistration();
	queryObj.context = helper.getContext();
	queryObj.since = helper.getSince();
	queryObj.until = helper.getUntil();
	queryObj.authoritative = helper.getAuthoritative();
	queryObj.sparse = helper.getSparse();
	queryObj.instructor = helper.getInstructor();
	queryObj.limit = 25;

    this.tcapiVersion = helper.getVersion();

    //Figure out the versions to use
    if(this.tcapiVersion == "all"){
        versionsToUse = this.allVersions;
    } else {
        versionsToUse = [this.tcapiVersion];
    }

    //Set the TCAPI query text
	var url = this.getDriver().recordStores[0].endpoint + "statements?" + queryObj.toString();
	$("#TCAPIQueryText").text(url);

    this.multiVersionStream = this.getMultiVersionStream(versionsToUse);
    this.multiVersionStream.loadStatements(queryObj, this.getCallback(this.statementsFetched));
};

TINCAN.Viewer.prototype.getMoreStatements = function(callback){
    this.multiVersionStream.loadStatements("more", this.getCallback(this.statementsFetched));
};

TINCAN.Viewer.prototype.statementsFetched = function(multiStream){
    var unwiredDivs;

    //If this query led no where, show no statements available method
	if(multiStream.exhausted()){
		$("#statementsLoading").hide();
		$("#noStatementsMessage").show();
	}

    //Alright, render all available statements
	$("#statementsLoading").hide();
	$("#theStatements").append(
        this.renderStatements(  
            multiStream.getAllStatements()));
    
    //Hook up the "show raw data" links
	unwiredDivs = $('div[tcid].unwired');
	unwiredDivs.click(function(){
		$('[tcid_data="' + $(this).attr('tcid') + '"]').toggle();
	});
	unwiredDivs.removeClass('unwired');

    //Show more button?
    $("#showAllStatements").toggle(!multiStream.exhausted());
};

TINCAN.Viewer.prototype.renderStatements = function(statements){
    var statements,
        allStmtStr,
        i,
        dt,
        aDate,
        stmtStr,
        stmt,
        verb,
        objDesc,
        answer,
        activityType
    ;


    function escapeHTML(text) {
        return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

	function getDateString(dt){
		var now = new Date();
		var usemonths = false;
		var usedays = false;
		var usehours = false;
		var useminutes = false;
		var useseconds = false;
		
		if (now.getFullYear() != dt.getFullYear()){
			if (now.getFullYear() - dt.getFullYear() <= 1){
				usemonths = true;
			} else {
				return (now.getFullYear() - dt.getFullYear()) + " years ago" 
			}
		}
		if (usemonths || (now.getUTCMonth() != dt.getUTCMonth())){
			if (now.getUTCMonth() - dt.getUTCMonth() <= 2){
				usedays = true;
			} else {
				return (now.getUTCMonth() - dt.getUTCMonth()) + " months ago" 
			}
		}
		if (usedays || (now.getUTCDate() != dt.getUTCDate())){
			if (now.getUTCDate() - dt.getUTCDate() <= 2){
				usehours = true;
			} else {
				return (now.getUTCDate() - dt.getUTCDate()) + " days ago" 
			}
		}
		if (usehours || (now.getUTCHours() != dt.getUTCHours())){
			if (now.getUTCHours() - dt.getUTCHours() <= 2){
				useminutes = true;
			} else {
				return (now.getUTCHours() - dt.getUTCHours()) + " hours ago" 
			}
		}
		if (useminutes || (now.getUTCMinutes() != dt.getUTCMinutes())){
			if (now.getUTCMinutes() - dt.getUTCMinutes() <= 2){
				useseconds = true;
			} else {
				return (now.getUTCMinutes() - dt.getUTCMinutes()) + " minutes ago" 
			}
		}
		if (useseconds){
			return (now.getUTCSeconds() - dt.getUTCSeconds()) + " seconds ago" 
		}
	}

    function determineStatementVersion(stmt){
        if(typeof stmt.verb == "string"){
            return "0.9";
        }
        return "0.95";
    }
    function getActorName(stmt){
        var version = determineStatementVersion(stmt);
        if(version == "0.9"){
            return getActorName_v09(stmt.actor);
        }
        else if (version == "0.95"){
            return getActorName_v095(stmt.actor);
        }
    }

	function getActorName_v09(actor){
		if(actor === undefined){
			return "";
		}
		if(actor.name !== undefined){
			return actor.name[0];
		}
		if(actor.lastName != undefined && actor.firstName != undefined){
			return actor.firstName[0] + " " + actor.lastName[0];
		}
		if(actor.familyName != undefined && actor.givenName != undefined){
			return actor.givenName[0] + " " + actor.familyName[0];
		}
		if(actor.mbox !== undefined){
			return actor.mbox[0].replace('mailto:','');
		}
		if(actor.account !== undefined){
			return actor.account[0].accountName;
		}
		return truncateString(JSON.stringify(actor), 20);
	}

	function getActorName_v095(actor){
		if(actor === undefined){
			return "";
		}
		if(actor.name !== undefined){
			return actor.name;
		}
		if(actor.mbox !== undefined){
			return actor.mbox.replace('mailto:','');
		}
		if(actor.account !== undefined){
			return actor.account.accountName;
		}
		return truncateString(JSON.stringify(actor), 20);
    }


    function getLangDictionaryValue(langDict){
        if(langDict["und"] != undefined){
            return langDict["und"];
        }
        if(langDict["en-US"] != undefined){
            return langDict["en-US"];
        }
        for(var key in langDict){
            return langDict[key];
        }
    }
	
	function getTargetDesc(stmt){
        var obj = stmt.object;
		if(obj.objectType !== undefined && obj.objectType !== "Activity"){
			return getActorName(stmt);
		}
		
		if(obj.definition !== undefined){
			if(obj.definition.name !== undefined){
                return getLangDictionaryValue(obj.definition.name);
			}
			
			if(obj.definition.description !== undefined){
                return truncateString(getLangDictionaryValue(obj.definition.description), 48);
			}
		}
		return obj.id;
	}

    function getResponseText(stmt){
        if(stmt == undefined || stmt.result == undefined || stmt.result.response == undefined){
            return null;
        }
        var response = stmt.result.response;

        if(stmt.object == undefined 
            || stmt.object.definition == undefined 
            || stmt.object.definition.type != "cmi.interaction"
            || stmt.object.definition.interactionType == undefined){
                return response;
        }

        var objDef = stmt.object.definition;

        var componentName = null;
        if(objDef.interactionType == "choice" || objDef.interactionType == "sequencing"){
            componentName = "choices";
        }
        else if (objDef.interactionType == "likert"){
            componentName = "scale";
        }
        else if (objDef.interactionType == "performance"){
            componentName = "steps";
        }

        if(componentName != null){
            var components = objDef[componentName];
            if (components != undefined && components.length > 0){
                var responses = response.split("[,]");
                var responseStr = [];
                var first = true;
                for(var i = 0; i < responses.length; i++){
                    for(var j = 0; j < components.length; j++){
                        var responseId = responses[i];
                        if(objDef.interactionType == "performance"){
                            responseId = responses[i].split("[.]")[0];
                        }
                        if(responseId == components[j].id){
                            if(!first){
                                responseStr.push(", ");
                            }
                            responseStr.push(getLangDictionaryValue(components[j].description));
                            if(objDef.interactionType == "performance"){
                                responseStr.push(" -> ");
                                responseStr.push(responses[i].split("[.]")[1]);
                            }
                            first = false;
                        }
                    }
                }
                if(responseStr.length > 0){
                    return responseStr.join('');
                }
            }
            return response;
        }

        if(objDef.interactionType == "matching"){
            if (objDef.source != undefined && objDef.source.length > 0
                 && objDef.target != undefined && objDef.target.length > 0){

                var source = objDef.source;
                var target = objDef.target;
                var responses = response.split("[,]");
                var responseStr = [];
                var first = true;

                for(var i = 0; i < responses.length; i++){
                    var responseParts = responses[i].split("[.]");
                    for(var j = 0; j < source.length; j++){
                        if(responseParts[0] == source[j].id){
                            if(!first){
                                responseStr.push(", ");
                            }
                            responseStr.push(getLangDictionaryValue(source[j].description));
                            first = false;
                        }
                    }
                    for(var j = 0; j < target.length; j++){
                        if(responseParts[1] == target[j].id){
                            responseStr.push(" -> ");
                            responseStr.push(getLangDictionaryValue(target[j].description));
                        }
                    }
                }

                if(responseStr.length > 0){
                    return responseStr.join('');
                }
            }
            return response;
        }

        return response;
    }
	
	function truncateString(str, length){
		if(str == null || str.length < 4 || str.length <= length){
			return str;
		}
		return str.substr(0, length-3)+'...';
	};

    function getVerbText(stmt){
        var version = determineStatementVersion(stmt);
        if(version == "0.9"){
            return getVerbText_v09(stmt);
        }
        else if (version == "0.95") {
            return getVerbText_v095(stmt);
        }
    }

    function getVerbText_v09(stmt){
        var verb = stmt.verb;
        if(verb == 'interacted'){
            verb = 'interacted with';
        }
        if(typeof stmt.context != "undefined" &&
            typeof stmt.context.extensions != "undefined" && 
            typeof stmt.context.extensions.verb != "undefined"){
            verb = stmt.context.extensions.verb;
        }
        if(stmt.inProgress == true){
            verb = verb + " (in progress)";
        }
        return verb;
    };

    function getVerbText_v095(stmt){
        var verb = stmt.verb;
        if(verb.display != null){
            return getLangDictionaryValue(verb.display);
        }
        return truncateString(verb.uri, 20);
	};
	

    allStmtStr = new Array();
	allStmtStr.push("<table>");

	for (i = 0; i < statements.length ; i++){
        stmtStr = [];
		stmt = statements[i];
		try {
			stmtStr.push("<tr class='statementRow'>");  
			stmtStr.push("<td class='date'><div class='statementDate'>"+ stmt.stored.replace('Z','')  +"</div></td>");

			stmtStr.push("<td >");
				stmtStr.push("<div class=\"statement unwired\" tcid='" + stmt.id + "'>")
					stmtStr.push("<span class='actor'>"+ escapeHTML(getActorName(stmt)) +"</span>");
			
					verb = getVerbText(stmt);
					objDesc = getTargetDesc(stmt);
					answer = null;
					
					if (stmt.object.definition !== undefined){
			            activityType = stmt.object.definition.type;
						if (activityType != undefined && (activityType == "question" || activityType.indexOf("interaction") >= 0)){
							if (stmt.result != undefined){
								if (stmt.result.success != undefined){
									verb = ((stmt.result.success)?"correctly ":"incorrectly ") + verb;
								}
								if (stmt.result.response != undefined){
									answer = " with response '" + escapeHTML(truncateString(getResponseText(stmt), 30)) + "' ";
								}
							}
						}
					}		
					
					stmtStr.push(" <span class='verb'>"+ escapeHTML(verb) +"</span>");
					stmtStr.push(" <span class='object'>'"+ escapeHTML(objDesc) +"'</span>");
					stmtStr.push((answer != "")? answer : ".");
					
					if (stmt.result != undefined){
						if (stmt.result.score != undefined){
                            if (stmt.result.score.scaled != undefined){
                                stmtStr.push(" with score <span class='score'>"+ Math.round((stmt.result.score.scaled * 100.0)) + "%</span>");
                            }
                            else if(stmt.result.score.raw != undefined){
							    stmtStr.push(" with score <span class='score'>"+ stmt.result.score.raw +"</span>");
                            }
						}
					}
					
				stmtStr.push("</div>");
				
				if(this.includeRawData){
					stmtStr.push("<div class='tc_rawdata' tcid_data='" + stmt.id + "'>");
						stmtStr.push("<pre>" + JSON.stringify(stmt, null, 4) + "</pre>")
					stmtStr.push("</div>");
				}
			
			stmtStr.push("</td></tr>");
            allStmtStr.push(stmtStr.join(''));
		}
		catch (error){
			this.log("Error occurred while trying to display statement with id " + stmt.id + ": " + error.message);
		}
	}
	allStmtStr.push("</table>");
	
    return allStmtStr.join('');
};


TINCAN.Viewer.prototype.pageInitialize = function(){
	var tcViewer = this;

	$.datepicker.setDefaults( {dateFormat: "yy-mm-dd", constrainInput: false} );
	$( "#since" ).datepicker();
	$( "#until" ).datepicker();
	
	$("#statementsLoading").show();
	$("#showAllStatements").hide();
	$("#noStatementsMessage").hide();
	
	$('#refreshStatements').click(function(){
		$("#statementsLoading").show();
		$("#showAllStatements").hide();
		$("#noStatementsMessage").hide();
		$("#theStatements").empty();
		tcViewer.searchStatements();
	});

	$('#showAllStatements').click(function(){
		$("#statementsLoading").show();
		tcViewer.getMoreStatements();
	});
	
	$("#showAdvancedOptions").click(function(){
		$("#advancedSearchTable").toggle('slow', function(){
			var visible = $("#advancedSearchTable").is(":visible");
			var text = (visible ? "Hide" : "Show") + " Advanced Options";
			$("#showAdvancedOptions").html(text);
		});
	});
	
	$("#showQuery").click(function(){
		$("#TCAPIQuery").toggle('slow', function(){
			var visible = $("#TCAPIQuery").is(":visible");
			var text = (visible ? "Hide" : "Show") + " TCAPI Query";
			$("#showQuery").html(text);
		});
	});

	(new this.TinCanFormHelper()).copyQueryStringToForm();
};



