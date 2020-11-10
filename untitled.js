log("loading javascript version 0.0.1");

var started = false;

const getGMPlayers = (pageid) => findObjs({ type: 'player' })
	.filter((p) => playerIsGM(p.id))
	.filter((p) => undefined === pageid || p.get('lastpage') === pageid)
	.map(p => p.id)
	;

const sendGMPing = (left, top, pageid, playerid = null, moveAll = false) => {
	let players = getGMPlayers(pageid);
	if (players.length) {
		sendPing(left, top, pageid, playerid, moveAll, players);
	}
};

function initRoll() {
	if (state.Harn.config.house_rule_randomize_init_roll) {
		return randomInteger(6) + randomInteger(6) + randomInteger(6);
	} else {
		return 0; // canon
	}

}

function buttonMaker(command, text, tip, style, size) {
	let tipExtra = (tip ? `class="showtip tipsy" title="${tip}"` : '');
	return `<a ${tipExtra} style="color:black;background-color:transparent;border: 1px solid #555555;border-radius:1em;display:inline-block;height:1em;line-height:1em;min-width:1em;padding:1px;margin:0;margin-left:.2em;text-align:center;font-size:${size}em;${style || ''}" href="${command}">${text}</a>`;
}

function labelMaker(text, tip, style, size = 1) {
	let tipExtra = (tip ? `class="showtip tipsy" title="${tip}"` : '');
	return `<a ${tipExtra} style="color:black;background-color:transparent;border: 1px solid #000000;display:inline-block;height:1em;line-height:1em;min-width:1em;padding:2px;margin:0;margin-left:.2em;text-align:center;font-size:${size}em;${style || ''}">${text}</a>`;
}



function getMeleeEML(toke, repeating_weapon_name, charid, mod = 0, loc = "mid", block = false) {
	var x = 0;
	var tot = parseInt(myGet(`${repeating_weapon_name}ML`, charid, 0));
	var targstr = `<div style='width:180px;'>Mastery Level: ${tot}<br>`;
	if (block) {
		x = parseInt(myGet(`${repeating_weapon_name}DEF`, charid, 0));
		if (x !== 0) {
			tot += x;
			targstr = `${targstr}Defence Mod: ${x}<br>`;
		}
	} else {
		x = parseInt(myGet(`${repeating_weapon_name}ATK`, charid, 0));
		if (x !== 0) {
			tot += x;
			targstr = `${targstr}Attack Mod: ${x}<br>`;
		}
	}
	x = parseInt(myGet(`${repeating_weapon_name}HM`, charid, 0));
	if (x !== 0) {
		tot += x;
		targstr = `${targstr}H Mod: ${x}<br>`;
	}
	if (toke.get('bar3_value')) {
		x = (parseInt(toke.get('bar3_value'))) * -5;
		if (x !== 0) {
			tot += x;
			targstr = `${targstr}Universal: ${x}<br>`;
		}
	} else {
		x = (parseInt(myGet('UNIVERSAL_PENALTY', charid, 0))) * -5;
		if (x !== 0) {
			tot += x;
			targstr = `${targstr}Universal: ${x}<br>`;
		}
	}
	x = parseInt(myGet('ENCUMBRANCE', charid, 0)) * -5;
	if (x !== 0) {
		tot += x;
		targstr = `${targstr}Encumbrance: ${x}<br>`;
	}
	x = -1 * hit_loc_penalty[loc]["penalty"];
	if (x !== 0) {
		tot += x;
		targstr = `${targstr}Location ${loc}: ${x}<br>`;
	}
	x = parseInt(mod);
	if (x !== 0) {
		tot += x;
		targstr = `${targstr}Situational Mod: ${x}<br>`;
	}
	var out = {}
	out['total'] = tot;
	out['targstr'] = `${targstr}</div>`;


	return out;
}



function getDodgeEML(toke, charid, mod = 0, bow = false) {
	var x = 0;
	var tot = parseInt(myGet(`DODGE_ML`, charid, 0));
	var targstr = `<div style='width:180px;'>Mastery Level: ${tot}<br>`;
	if (bow) {
		x = Math.round(tot / -2);
		tot += x;
		targstr = `${targstr}Bow Mod: ${x}<br>`;
	}
	if (toke.get('bar3_value')) {
		x = (parseInt(toke.get('bar3_value'))) * -5;
		if (x !== 0) {
			tot += x;
			targstr = `${targstr}Universal: ${x}<br>`;
		}
	} else {
		x = (parseInt(myGet('UNIVERSAL_PENALTY', charid, 0))) * -5;
		if (x !== 0) {
			tot += x;
			targstr = `${targstr}Universal: ${x}<br>`;
		}
	}
	x = parseInt(myGet('ENCUMBRANCE', charid, 0)) * -5;
	if (x !== 0) {
		tot += x;
		targstr = `${targstr}Encumbrance: ${x}<br>`;
	}
	x = parseInt(mod);
	if (x !== 0) {
		tot += x;
		targstr = `${targstr}Situational Mod: ${x}<br>`;
	}
	var out = {}
	out['total'] = tot;
	out['targstr'] = `${targstr}</div>`;


	return out;
}


function computeAttackML(ojn, charid, app, mod) {

	return parseInt(myGet(ojn.slice(0, -4) + "ML", charid, 0))
		+ parseInt(myGet(ojn.slice(0, -4) + "ATK", charid, 0))
		+ parseInt(myGet(ojn.slice(0, -4) + "HM", charid, 0))
		+ parseInt(mod) - (app);
}

function getSelectedPage(msg) {
	if (msg.selected) {
		var obj = getObj("graphic", msg.selected[0]['_id']);
		return obj.get("_pageid")
	} else {
		return getPlayerPage(msg.playerid)
	}
}

function getImpact(base, repeating_weapon_name, charid, aspect = "H", missi = null) {

	var out = {}
	var wepimpact = getWeaponImpact(repeating_weapon_name, charid, aspect, missi);
	out['impactstr'] = "";
	out['total'] = 0;

	var sides = 6;
	var bm = 0;

	var imd = "";
	var attribute = findObjs({
		type: 'attribute',
		characterid: charid,
		name: repeating_weapon_name + "NOTE"
	})[0]

	if (attribute) {
		imd = attribute.get('current');

	}

	if (imd.length > 0) {
		var t = imd.split(":!")

		if (t.length > 1) {
			var impactmod = t[1].split(":");
			if (impactmod.length == 1) {
				wepimpact.impact += parseInt(impactmod[0]);
				log("Impact mod: " + impactmod[0]);
			}
			if (impactmod.length == 3) {
				sides = parseInt(impactmod[1]);
				bm = parseInt(impactmod[2]);
				if (parseInt(impactmod[0]) > 0) {

					for (i = 0; i < parseInt(impactmod[0]); i++) {
						var ir = randomInteger(sides) + bm;
						out.total += ir;
						if (out.impactstr.length > 2) {
							out.impactstr += " + " + ir;
						} else {
							let bmExtra = ((bm !== 0) ? `+${bm}` : '');
							out.impactstr += `${base}+${impactmod[0]}(d${sides}${bmExtra}): ${ir}`;
						}
					}
				}
			}
		}
	}
	for (i = 0; i < base; i++) {
		var ir = randomInteger(sides) + bm;
		out.total += ir
		if (out.impactstr.length > 2) {
			out.impactstr += " + " + ir;

		} else {
			let bmExtra = ((bm !== 0) ? `+${bm}` : '');
			out.impactstr += `${base}(d${sides}${bmExtra}): ${ir}`;

		}
	}


	out.total += wepimpact.impact;
	out.impactstr += " + " + "<br>Weapon Impact: " + wepimpact.impact;
	out.aspect = wepimpact.aspect;
	return out;

}

function getWeaponImpact(repeating_weapon_name, charid, aspect = "H", missi = null) {
	var out = {};


	if (aspect == "H") {

		var baspect = myGet(`${repeating_weapon_name}B`, charid, 0)
		var easpect = myGet(`${repeating_weapon_name}E`, charid, 0)
		var paspect = myGet(`${repeating_weapon_name}P`, charid, 0)
		out['impact'] = 0;
		if (baspect !== "-") {
			out['impact'] = parseInt(baspect);
			out['aspect'] = "B";
		}
		if (easpect !== "-") {
			if (parseInt(easpect) >= out['impact']) {
				out['impact'] = parseInt(easpect);
				out['aspect'] = "E";
			}
		}
		if (paspect !== "-") {
			if (parseInt(paspect) >= out['impact']) {
				out['impact'] = parseInt(paspect);
				out['aspect'] = "P";
			}
		}
	} else {
		out['impact'] = parseInt(myGet(`${repeating_weapon_name}${aspect}`, charid, 0));
		out['aspect'] = aspect;
	}

	if (missi) {
		if (myGet(`${repeating_weapon_name}NAME`, charid, "") in missile_range) {
			out.impact = missi[1];
		} else {
			out.impact = Math.round(out.impact * parseFloat(missi[1]))
		}
	}
	return out;

}

function getPlayerPage(player_id) {
	var psp = Campaign().get("playerspecificpages");
	if (psp) {
		if (player_id in psp) {
			return psp[player_id];
		} else {
			return Campaign().get("playerpageid");
		}
	} else {
		return Campaign().get("playerpageid");
	}
}


function determineSuccess(ml, roll) {
	if (roll <= ml) {
		if (roll % 5 == 0) {
			return { asuc: "CS", ais: 3 };
		} else {
			return { asuc: "MS", ais: 2 };
		}
	} else {
		if (roll % 5 !== 0) {
			return { asuc: "MF", ais: 1 };
		} else {
			return { asuc: "CF", ais: 0 };
		}
	}
}
function determineDefSuccess(ml, roll) {
	if (roll <= ml) {
		if (roll % 5 == 0) {
			return { dsuc: "CS", dis: 3 };
		} else {
			return { dsuc: "MS", dis: 2 };
		}
	} else {
		if (roll % 5 !== 0) {
			return { dsuc: "MF", dis: 1 };
		} else {
			return { dsuc: "CF", dis: 0 };
		}
	}
}


function findWeapon(charid, weaponname) {
	return filterObjs(function(obj) {
		obn = obj.get('name');
		if (obn) {
			if ((obn.indexOf("WEAPON_NAME")) !== -1
				&& (obj.get("_characterid") == charid)
				&& (obj.get("current") == weaponname)) {
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	});
}

function missileAttack(dist, wepname, atkmov, charid) {
	var missi = getrange(wepname, dist[0]);

	var app = -1 * missi[0];
	var appstr = `Missile Range: ${app}<br>`;

	if (atkmov < 5) {
		app = app + Math.round(parseInt(myGet('ENCUMBRANCE', charid, 0)) * 2.5);
		appstr = `${appstr}No Movement: ${Math.round(parseInt(myGet('ENCUMBRANCE', charid, 0)) * 2.5)}<br>`;
	}
	if (atkmov > 5) {
		app = app - 10;
		appstr = `${appstr}Movement: -10<br>`;
	}
	if (myGet('IS_MOUNTED', charid, 0) == 'on') {
		app = app - 10;
		appstr = `${appstr}Mounted: -10<br>`;
	}
	return { missi, app, appstr };
}


function charLog(character_id, text, rtime = false, gtime = false) {
	var logout = myGet("TEXTAREA_LOG", character_id, "");
	if (rtime) {
		var d = new Date();
		var n = d.toLocaleString();
		logout += n + ":  ";
	}
	if (gtime) { logout += getHarnTimeStr(state.MainGameNS.GameTime) + ": "; }
	mySet("TEXTAREA_LOG", character_id, logout + text + "\n")

}

function handle_pickskill(args, msg) {
	sendChat("Skill Improvement Roll", msg.content.slice(msg.content.indexOf(args[1]) + 21) + "<br>[Pick Skill](!improveskill " + args[1]
		+ " %{" + msg.content.slice(msg.content.indexOf(args[1]) + 21) + "|helper-SkillList})")
}


function handle_improveskill(args, msg) {
	char = getObj("character", args[1]);
	skill_att_name = findSkill(char, args[2]);
	var d = new Date();
	var n = d.toLocaleString();
	var ml = parseInt(myGet(skill_att_name.slice(0, -4) + "ML", char.id, 0));

	roll = randomInteger(100) + parseInt(myGet(skill_att_name.slice(0, -4) + "SB", char.id, 0));
	if (roll >= ml) {
		mySet(skill_att_name.slice(0, -4) + "ML", char.id, (ml + 1));
		sendChat("Skill Improvement " + myGet("NAME", char.id, ""), "<br>"
			+ "<br>" + " roll " + roll + ": SUCCESS<br>" + args[2] + " ML increases to " + (ml + 1));
		charLog(char.id, ": Skill Improvement Roll: " + args[2] + " "
			+ roll + ": SUCCESS: ML = " + (ml + 1), state.Harn.config.realtime, state.Harn.config.gametime);
	} else {
		sendChat("Skill Improvement " + myGet("NAME", char.id, ""), "<br>" + args[2]
			+ "<br>" + " roll " + roll + ": FAIL<br> " + args[2] + " ML stays at " + ml);
		charLog(char.id, ": Skill Improvement Roll: " + args[2] + " "
			+ roll + ": FAIL: ML = " + ml, state.Harn.config.realtime, state.Harn.config.gametime);
	}
}


function rollshock(charid, token, unipenalty) {
	var shockstr = "";
	var shockroll = 0;
	for (i = 0; i < unipenalty; i++) {
		var ir = randomInteger(6);
		shockroll = shockroll + ir
		if (i > 0) {
			shockstr += " + " + ir;

		} else {
			shockstr += `${unipenalty}d6: ${ir}`;

		}
	}
	end = myGet("COMBAT_ENDURANCE", charid, 0);
	if (shockroll > end) {
		token.set("status_sleepy");
		return "<br/>Shock Roll: " + labelMaker(shockroll, shockstr) + "<br/><h4>FAIL</h4>";
	} else {
		return "<br/>Shock Roll: " + labelMaker(shockroll, shockstr) + "<br/>Pass";
	}

}

function handle_rollatts(args, msg) {
	var char = getObj("character", args[1]);
	var rolls = ["STR", "STA", "DEX", "AGL", "INT", "AUR", "WIL", "EYE",
		"HRG", "SML", "VOI", "CML", "FRAME"]
	_.each(rolls, function(attname) {
		var r = randomInteger(6) + randomInteger(6) + randomInteger(6);
		if (msg.content.indexOf("?") !== -1) {
			myGet(attname, char.id, r);
		} else {
			mySet(attname, char.id, r);
		}
	});
	var autoskills = ["CLIMBING_SB", "CONDITION_SB", "DODGE_SB", "JUMPING_SB",
		"STEALTH_SB", "THROWING_SB", "AWARENESS_SB", "INTRIGUE_SB",
		"ORATORY_SB", "RHETORIC_SB", "SINGING_SB", "INITIATIVE_SB",
		"UNARMED_SB"]
	_.each(autoskills, function(skillname) {
		myGet(skillname, char.id, 1);

	});
}
function gethiteff(loc, effImp) {
	var lr = "None";
	if (effImp > 0) {
		var col = 4;
	}
	if (effImp > 4) {
		var col = 5;
	}
	if (effImp > 8) {
		var col = 6;
	}
	if (effImp > 12) {
		var col = 7;
	}
	if (effImp > 16) {
		var col = 8;
	}
	_.each(hit_location_table, function(row) {
		if (row[3] == loc) {
			lr = row[col];
		}

	});

	return lr;
}

function gethitloc(roll, aim) {
	var lr;
	_.each(hit_location_table, function(row) {
		if (row[aim] !== "-") {
			if (parseInt(row[aim].slice(0, 2)) <= roll) {
				lr = row[3];
				if (trace) { log(`location table ${row[aim]} hits ${row[3]}`) }
			}
		}

	});

	return lr;
}



function getCharByNameAtt(charname) {
	var attr = findObjs({
		current: charname,
		name: "NAME",
		_type: "attribute",
	})[0];
	return getObj("character", attr.get('_characterid'));
}
/**
 * Update the skill bonues of the active sheet.
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_calcsb(args, msg) {
	if (trace) { log(`handle_calcsb(${args},${msg.content})`) }
	var char = getObj("character", args[1]);
	if (char) {
		calcSB(char, msg);
	}
}

/**
 * Allow the hand of god to tip the scales.
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_cheat(args, msg) {
	if (trace) { log(`handle_cheat(${args},${msg.content})`) }
	if (playerIsGM(msg.playerid)) {
		state.MainGameNS["cheat"] = parseInt(msg.content.slice(6));
		log("cheat: " + msg.content.slice(6));
	}
}

/**
 * I do not know
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_mapsend(args, msg) {
	if (trace) { log(`handle_mapsend(${args},${msg.content})`) }
	args = msg.content.substr(9).split(",");
	//TODO defensive programming
	var player = findObjs({
		type: 'player',
		_displayname: args[0]
	})[0];

	//TODO defensive programming
	var page = findObjs({
		type: 'page',
		name: args[1]
	})[0];

	var playerspecificpages = new Object();
	var pl = new Object();
	if (Campaign().get("playerspecificpages")) {
		playerspecificpages = Campaign().get("playerspecificpages");
		Campaign().set("playerspecificpages", false);
	}

	pl[player.id] = page.id;
	playerspecificpages = Object.assign(playerspecificpages, pl);
	log(playerspecificpages);
	Campaign().set("playerspecificpages", playerspecificpages);
}

/**
 * This command is obsolete now that we initialize item lists on startup.
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_itemlist(args, msg) {
	if (trace) { log(`handle_itemlist(${args},${msg.content})`) }
	initializeTables(msg.playerid);
}

/**
 * Populates the character skills with occupation appropriate skills (and starting ML?)
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_occupation(args, msg) {
	if (trace) { log(`handle_occupation(${args},${msg.content})`) }
	var char = getObj("character", args[1]);
	if (char) {
		log(msg.content.slice(33));
		var occ = myGet('OCCUPATION', char.id, "Farmer");
		if (occ in occupational_skills) {
			_.each(occupational_skills[occ], function(skl) {
				sk = skl.split("/");
				skn = findSkill(char, sk[0]).slice(0, -4);
				log(skn);
				mySet(skn + "ML", char.id, sk[1]);

			});
		}
	}
}
function handle_gmrand(args, msg) {
	if (trace) { log(`handle_gmrand(${args},${msg.content})`) }
	if (!msg.selected) { return; }
	//log(msg.selected);
	var objid = msg.selected[randomInteger(msg.selected.length) - 1];
	//log(objid['_id']);
	var obj = getObj("graphic", objid['_id']);
	sendGMPing(obj.get('left'), obj.get('top'), obj.get('pageid'), "", true);
	sendChat("Random Character", "/w gm " + obj.get('name'));
}

function handle_rand(args, msg) {
	if (trace) { log(`handle_rand(${args},${msg.content})`) }
	if (!msg.selected) { return; }
	//log(msg.selected);
	var objid = msg.selected[randomInteger(msg.selected.length) - 1];
	//log(objid['_id']);
	var obj = getObj("graphic", objid['_id']);
	sendPing(obj.get('left'), obj.get('top'), obj.get('pageid'), "", true);
	sendChat("Random Character", obj.get('name'));
	return { objid, obj };
}

function handle_addtime(args, msg) {
	if (trace) { log(`handle_addtime(${args},${msg.content})`) }
	state.MainGameNS.GameTime += parseInt(args[1]);
	sendChat("Timekeeper", getHarnTimeStr(state.MainGameNS.GameTime));
	//log(getHarnTimeStr(state.MainGameNS.GameTime));
}

function handle_settime(args, msg) {
	if (trace) { log(`handle_settime(${args},${msg.content})`) }
	setHarnTime(args);
	log(getHarnTimeStr(state.MainGameNS.GameTime));
}

function handle_time(args, msg) {
	if (trace) { log(`handle_time(${args},${msg.content})`) }
	log(getHarnTimeStr(state.MainGameNS.GameTime));
	sendChat("Timekeeper", getHarnTimeStr(state.MainGameNS.GameTime));
}

function handle_loc(args, msg) {
	if (trace) { log(`handle_loc(${args},${msg.content})`) }
	gethitloc(args[1], args[2]);
}

function handle_attack_melee_table(args, msg) {
	if (trace) { log(`handle_attack_melee_table(${args},${msg.content})`) }
	sendChat(msg.who, "Melee Attack Result<br/>" + attack_melee[args[1]][args[2]][args[3]] + "<br/>");
}

function handle_out(args, msg) {
	if (trace) { log(`handle_out(${args},${msg.content})`) }
	var g = getObj(msg.selected[0]['_type'], msg.selected[0]['_id']);
	out(g.get("represents"));
}

/**
 * handle the tokemove command (no clue)
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_tokemove(args, msg) {
	if (trace) { log(`handle_tokemove(${args},${msg.content})`) }
	if (args.length == 2) {
		var obj = getObj("graphic", args[1]);
		sendChat(msg.who, "Move = " + tokemove(obj));
	} else {
		log("Please select character");
	}
}

/**
 * handle the clearmove command (no clue)
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_clearmove(args, msg) {
	if (trace) { log(`handle_clearmove(${args},${msg.content})`) }
	if (args.length == 2) {
		var obj = getObj("graphic", args[1]);
		obj.set('lastmove', obj.get('left') + ',' + obj.get('top'));
	} else {
		log("Please select character");
	}
}

/**
 * Adds item to inventory.
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_addItem(args, msg) {
	if (trace) { log(`handle_addItem(${args},${msg.content})`) }
	if (args.length > 2) {
		log(msg.content.slice(30));
		addItem(args[1], msg.content.slice(30));
	} else {
		log("Please select character");
	}
}

/**
 * Calculate armor values (protection at locations).
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_ca(args, msg) {
	if (trace) { log(`handle_ca(${args},${msg.content})`) }
	if (args.length > 1) {
		calcArmor(args[1]);
	}
	else if (msg.selected) {
		var g = getObj(msg.selected[0]['_type'], msg.selected[0]['_id']);

		if (g.get("represents")) {
			calcArmor(g.get("represents"));
		}
	} else {
		log("Please select character");
	}
}

/**
 * Import a character generated with HârnMaster Character Utility from https://www.lythia.com/game_aides/harnchar/
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_xin(args, msg) {
	if (trace) { log(`handle_xin(${args},${msg.content})`) }
	if (args.length > 1) {
		log(args[1]);
		xin(args[1]);
	} else if (msg.selected) {
		var g = getObj(msg.selected[0]['_type'], msg.selected[0]['_id']);

		if (g.get("represents")) {
			xin(g.get("represents"));
		}

	} else {
		log("Please select character");
	}
}

/**
 * This command appears obsolete.
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_move(args, msg) {
	if (trace) { log(`handle_move(${args},${msg.content})`) }
	if (msg.selected) {
		var g = getObj(msg.selected[0]['_type'], msg.selected[0]['_id']);
		//log(tokemove(g))
	} else {
		log("Please select token");
	}
}

/**
 * ?
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_invin(args, msg) {
	if (trace) { log(`handle_invin(${args},${msg.content})`) }
	if (args.length > 1) {
		//log(args[1]);
		invin(args[1]);
	} else if (msg.selected) {
		var g = getObj(msg.selected[0]['_type'], msg.selected[0]['_id']);
		if (g.get("represents")) {
			invin(g.get("represents"));
		}
	} else {
		log("Please select character");
	}
}

/**
 * The command used for attacking without a selected token
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_sheetattack(args, msg) {
	if (trace) { log(`handle_sheetattack(${args},${msg.content})`) }
	handle_attack(args, msg);
}

/**
 * Calculate distance between two tokens?.
 * @param {Message} msg the message representing the command, with arguments separated by spaces
 */
function handle_tokendis(args, msg) {
	if (trace) { log(`handle_tokendis(${args},${msg.content})`) }
	const startToken = getObj("graphic", args[1]);
	const endToken = getObj("graphic", args[2]);
	if (startToken != null && endToken != null) {
		dis = tokendistance(startToken, endToken);
		sendChat("Token Distance", dis[0] + " " + dis[1] + "<br/>");
	} else {
		sendChat('H&acirc;rn API', `unable to resolve ${args[1]} or ${args[2]}`);
	}
}

function initializeTables(playerid) {
	if (trace) { log(`>initializeTables(${playerid})`) }
	var gms = findObjs({ type: 'player' }).filter((p) => playerIsGM(p.id));
	var gmId;
	if (gms.length > 0) {
		gmId = gms[0].id;
	} else {
		log("error - no gm found")
		if (playerid != 0) {
			gmId = playerid
		} else {
			return;
		}
	}
	if (state.Harn.config.generate_item_list) {
		generateItemListMacros(gmId);
	} else { if (trace) { log(`no item list`) } }
	defineGlobalMacros(gmId);
	defineCharacterAbilities();
	
	sendChat('H&acirc;rn API', getHarnTimeStr(state.MainGameNS.GameTime));

	if (trace) { log("<initializeTables()") }
	return;
}

function generateItemListMacros(gmId) {
	const items = Object.keys(prices).sort();
	createWeaponListMacro(items, gmId);
	createArmorListMacro(items, gmId);
	createItemListMacro(items, gmId);
}

function createArmorListMacro(items, gmId) {
	const outarmor = items
						.filter((item) => (item.substr(0, item.lastIndexOf(",")) in armor_coverage))
						.reduce((out, item) => { return `${out}|${item.replace(/,/g, "&#44;")}`}, "?{Item") + "}";
	findObjs({
		type: 'macro',
		playerid: gmId,
		name: 'helper-ArmorList'
	}).forEach((macro)=>{macro.remove()});
	if (trace) log(`#helper-ArmorList=${outarmor}`);
	createObj('macro', {
		name: 'helper-ArmorList',
		visibleto: "all",
		action: outarmor,
		playerid: gmId
	});
}

function createWeaponListMacro(items, gmId) {
	log(`createWeaponListMacro(${items},${gmId})`);
	const outweap = _.filter(items,
							(item) => (item in weapons_table))
						.reduce((out, item) => { return `${out}|${item.replace(/,/g, "&#44;")}`}, "?{Item") + '}';
	findObjs({
		type: 'macro',
		playerid: gmId,
		name: 'helper-WeaponList'
	}).forEach((macro)=>{macro.remove()});
	if (trace) log(`#helper-WeaponList=${outweap}`);
	createObj('macro', {
		name: 'helper-WeaponList',
		visibleto: "all",
		action: outweap,
		playerid: gmId
	});
}

function createItemListMacro(items, gmId) {
	const out = items
					.filter((item) => (!(item in weapons_table || item.substr(0, item.lastIndexOf(",")) in armor_coverage)))
					.reduce((out, item) => { return `${out}|${item.replace(/,/g, "&#44;")}`}, "?{Item") + '}';
	findObjs({
		type: 'macro',
		playerid: gmId,
		name: 'helper-ItemList'
	}).forEach((macro)=>{macro.remove()});
	if (trace) log(`#helper-ItemList=${out}`);
	createObj('macro', {
		name: 'helper-ItemList',
		visibleto: "all",
		action: out,
		playerid: gmId
	});
}

function defineCharacterAbilities() {
	if (trace)
		log("Creating default character abilities");
	var chars = findObjs({ _type: "character", });
	chars.forEach(function (c) {
		const char_name = c.get("name");
		setWeaponsList(c.id);
		setSkillList(c.id);
		_.each(default_abilities, function (ability, abilityName) {
			if (trace) log(`Ability ${char_name}#${abilityName}=${ability}`);
			findObjs({
				type: 'ability',
				_characterid: c.id,
				name: abilityName
			}).forEach((existingAbility) => { existingAbility.remove(); });
			createObj('ability', {
				name: abilityName,
				action: ability,
				_characterid: c.id,
				istokenaction: true
			});
		});
	});
}

function defineGlobalMacros(gmId) {
	if (trace)
		log("Creating default macros");
	_.each(default_macros, function (macro, macroName) {
		if (trace) { log("macro: " + macroName); }
		findObjs({
			type: 'macro',
			playerid: gmId,
			name: macroName
		}).forEach((existingMacro) => { existingMacro.remove(); });
		createObj('macro', {
			name: macroName,
			visibleto: "all",
			action: macro,
			playerid: gmId
		});
	});
}

function getWep(charid) {
	return filterObjs(function(obj) {
		obn = obj.get('name');
		if (obn) {
			if (obn.includes("WEAPON_NAME")
				&& (obj.get("_characterid") == charid)) {
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	});
}

function setWeaponsList(charid) {
	if (trace) log("Ability helper-Weapons");
	var out2 = "";
	getWep(charid).forEach(function(w) {
		out2 += "|" + myGet(w.get('name'), charid, "");
	})
	out2 = out2.replace(/,/g, "&#44;");
	out2 = "?{Weapon" + out2 + "}";
	var mac = findObjs({
		type: 'ability',
		_characterid: charid,
		name: 'helper-Weapons'
	})[0];

	if (mac) {
		mac.set('action', out2);
	} else {
		createObj('ability', {
			name: 'helper-Weapons',
			action: out2,
			_characterid: charid
		});
	}



}

function setSkillList(charid) {
	if (trace) log("Macro helper-Skilllist");
	var out = "";
	var sl = skillList(charid);

	for (i = 0; i < sl.length; i++) {
		out += "|" + sl[i];
	}

	out = out.replace(/,/g, "&#44;").replace(/\)/g, '&#41;');
	out = "?{Skills" + out + "}";
	var mac = findObjs({
		type: 'ability',
		_characterid: charid,
		name: 'helper-SkillList'
	}).forEach((macro)=>{macro.remove()});
	createObj('ability', {
		name: 'helper-SkillList',
		action: out,
		_characterid: charid
	});
}


function addinjury(loc, injstr, charid) {
	if ((injstr.indexOf("Fum") == 0) || (injstr.indexOf("Stu") == 0)) {
		var sev = injstr.slice(3, 4);
		var lvl = parseInt(injstr.slice(4, 5));
	} else {
		var sev = injstr.slice(0, 1);
		var lvl = parseInt(injstr.slice(1, 2))
	}
	var mid = makeid();

	mySet("repeating_injury_" + mid + "_INJURY_LOCATION", charid, loc);
	mySet("repeating_injury_" + mid + "_INJURY_SEVERITY", charid, sev);
	mySet("repeating_injury_" + mid + "_INJURY_LEVEL", charid, lvl);
	mySet("repeating_injury_" + mid + "_INJURY_HEALINGROLL", charid, "");
	mySet("repeating_injury_" + mid + "_INJURY_INFECTED", charid, 0);
	mySet("repeating_injury_" + mid + "_INJURY_INFECTED_FEEDBACK", charid, 0);

	return;
}



function getrange(weapname, dist) {
	if (!(weapname in missile_range)) { weapname = "Melee"; }
	for (var i = 4; i >= 0; i--) {
		if ((missile_range[weapname][i][0] * 5) > dist) {
			if (i == 0) {
				var penalty = state.Harn.config.house_rule_missle_close_range_mod;
			} else {
				var penalty = (i - 1) * 20;
			}
			var impact = missile_range[weapname][i][1];
		}
	}
	return [penalty, impact]
}



function handle_newturn(args, msg) {
	turnorder = [];

	var currentPageGraphics = findObjs({
		_pageid: getSelectedPage(msg),
		_type: "graphic",
	});

	_.each(currentPageGraphics, function(obj) {

		if (obj.get('represents').startsWith('-M') && (obj.get('layer') == 'objects') && !obj.get('status_skull')) {

			if (msg.selected) {
				for (i = 0; i < msg.selected.length; i++) {
					if (obj.id == msg.selected[i]["_id"]) {
						turnPush(obj);
					}
				}
			} else {
				turnPush(obj);
			}
		}
	});
	Campaign().set("turnorder", JSON.stringify(turnorder.sort((a, b) => (a.pr < b.pr) ? 1 : -1)));

	state.MainGameNS.GameTime += 10;
	sendChat("New Round", getHarnTimeStr(state.MainGameNS.GameTime));
}

function turnPush(obj) {
	if (obj.get('bar3_value')) {
		var pp = (parseInt(obj.get('bar3_value')) + parseInt(myGet('ENCUMBRANCE', obj.get("represents"), 0))) * 5;
	} else {
		var pp = (parseInt(myGet('UNIVERSAL_PENALTY', obj.get("represents"), 0)) + parseInt(myGet('ENCUMBRANCE', obj.get("represents"), 0))) * 5;
	}
	obj.set('lastmove', obj.get('left') + ',' + obj.get('top'))

	if (obj.get('status_sleepy')) {
		var initml = 0;
	} else {
		if (myGet("IS_MOUNTED", obj.get("represents"), 0) == "on") {
			var initml = Math.round(((parseInt(myGet("RIDING_ML", obj.get("represents"), 0)) + parseInt(myGet("STEED_INIT", obj.get("represents"), 0))) / 2) - pp + initRoll());
		} else {
			var initml = parseInt(myGet("INITIATIVE_ML", obj.get("represents"), 0)) - pp + initRoll();
		}
	}

	turnorder.push({
		id: obj.id,
		pr: initml,
		custom: ""
	});
}

function addWeapon(charid, weapon_name) {
	if (trace) { log("addWeapon(" + charid + ", " + weapon_name + ")") }
	if (weapon_name in weapons_table) {

		var mid = makeid();
		mySet("repeating_weapon_" + mid + "_WEAPON_NAME", charid, weapon_name);
		if (weapon_name in prices) { mySet("repeating_weapon_" + mid + "_WEAPON_WGT", charid, prices[weapon_name]["weight"]); } else {
			mySet("repeating_weapon_" + mid + "_WEAPON_WGT", charid, 0);
		}
		mySet("repeating_weapon_" + mid + "_WEAPON_WQ", charid, weapons_table[weapon_name][0]);
		mySet("repeating_weapon_" + mid + "_WEAPON_ATK", charid, weapons_table[weapon_name][1]);
		mySet("repeating_weapon_" + mid + "_WEAPON_DEF", charid, weapons_table[weapon_name][2]);
		mySet("repeating_weapon_" + mid + "_WEAPON_HM", charid, weapons_table[weapon_name][3]);
		mySet("repeating_weapon_" + mid + "_WEAPON_B", charid, weapons_table[weapon_name][4]);
		mySet("repeating_weapon_" + mid + "_WEAPON_E", charid, weapons_table[weapon_name][5]);
		mySet("repeating_weapon_" + mid + "_WEAPON_P", charid, weapons_table[weapon_name][6]);

		if (weapon_name.indexOf("Unarmed") == 0) {
			mySet("repeating_weapon_" + mid + "_WEAPON_ML", charid, myGet("UNARMED_ML", charid, 0));
		} else {
			var wepskill = filterObjs(function(obj) {
				obn = obj.get('name');
				if (obn) {
					if ((obn.indexOf("COMBATSKILL_NAME")) !== -1 && (obj.get("_characterid") == charid) && (weapon_name.indexOf(obj.get("current")) !== -1)) {
						return true;
					} else { return false; }
				} else { return false; }
			});

			if (wepskill[0]) {
				mySet("repeating_weapon_" + mid + "_WEAPON_ML", charid, myGet(wepskill[0].get('name').slice(0, -4) + "ML", charid, 0));
			}
		}
		mySet("repeating_weapon_" + mid + "_WEAPON_AML", charid, 0);
		mySet("repeating_weapon_" + mid + "_WEAPON_DML", charid, 0);
		mySet("repeating_weapon_" + mid + "_WEAPON_NOTE", charid, " ");
	}
	var mid = makeid();
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_NAME", charid, weapon_name);
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_TYPE", charid, "Weapon");
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_LOCATION", charid, "");
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_Q", charid, "0");
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_QUANTITY", charid, "1");
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WORN", charid, "on");


	if (weapon_name in prices) {
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WGT", charid, prices[weapon_name]["weight"]);
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_PRICE", charid, prices[weapon_name]["price"]);
	} else {
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WGT", charid, 0);
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_PRICE", charid, 0)
	}

}

function addItem(charid, item) {
	if (trace) { log("addItem(" + charid + ", " + item + ")") }
	if (item in weapons_table) {
		addWeapon(charid, item);
	} else {
		var mid = makeid();
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_NAME", charid, item);
		if (item.substr(0, item.lastIndexOf(",")) in armor_coverage) {
			mySet("repeating_inventoryitems_" + mid + "_INVENTORY_TYPE", charid, "Armor");
		} else {
			mySet("repeating_inventoryitems_" + mid + "_INVENTORY_TYPE", charid, "Item");
		}

		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_NOTES", charid, "");
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_Q", charid, "0");
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_QUANTITY", charid, "1");
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WORN", charid, "on");
		log(item)


		if (item in prices) {
			mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WGT", charid, prices[item]["weight"]);
			mySet("repeating_inventoryitems_" + mid + "_INVENTORY_PRICE", charid, prices[item]["price"]);
		} else {
			mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WGT", charid, 0);
			mySet("repeating_inventoryitems_" + mid + "_INVENTORY_PRICE", charid, 0)
		}
	}
}

function addArmor(charid, item) {
	if (trace) { log("addIArmor(" + charid + ", " + item + ")") }
	var mid = makeid();
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_NAME", charid, item);
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_TYPE", charid, "Armor");
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_NOTES", charid, "");
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_Q", charid, "0");
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_QUANTITY", charid, "1");
	mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WORN", charid, "on");


	if (item in prices) {
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WGT", charid, prices[item]["weight"]);
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_PRICE", charid, prices[item]["price"]);
	} else {
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WGT", charid, 0);
		mySet("repeating_inventoryitems_" + mid + "_INVENTORY_PRICE", charid, 0)
	}
}

function calcArmor(charid) {

	var atts = filterObjs(function(obj) {
		obn = obj.get('name');
		if (obn) {
			if ((obn.indexOf("INVENTORY_NAME")) !== -1 && (obj.get("_characterid") == charid)) {
				return true;
			} else { return false; }
		} else { return false; }
	});



	var newa = coverage2loc
	_.each(newa, function(ob1) {
		ob1["COV"] = "";
		ob1["AQ"] = 0;
		ob1["B"] = 0;
		ob1["E"] = 0;
		ob1["P"] = 0;
		ob1["F"] = 0;



	});
	_.each(atts, function(ob1) {


		var ojn = ob1.get('name');
		if (myGet(ojn.slice(0, -4) + "TYPE", charid, 0) == "Armor") {
			if (myGet(ojn.slice(0, -4) + "WORN", charid, 0) == "on") {
				ojv = ob1.get('current');
				if (ojv.slice(ojv.lastIndexOf(",") + 2) in armor_prot) {

					var art = armor_prot[ojv.slice(ojv.lastIndexOf(",") + 2)];

					if (ojv.slice(0, ojv.lastIndexOf(",")) in armor_coverage) {
						var arl = armor_coverage[ojv.slice(0, ojv.lastIndexOf(","))]["coverage"];
						for (var i = 0; i < arl.length; i++) {
							newa[arl[i]]["COV"] += " " + art[0];
							aq = parseInt(myGet(ojn.slice(0, -4) + "Q", charid, 0))
							newa[arl[i]]["AQ"] += aq;
							newa[arl[i]]["B"] += parseInt(art[1]) + aq;
							newa[arl[i]]["E"] += parseInt(art[2]) + aq;
							newa[arl[i]]["P"] += parseInt(art[3]) + aq;
							newa[arl[i]]["F"] += parseInt(art[4]) + aq;
						}
					}
				}
			}
		}
	});

	_.each(newa, function(ob1) {
		mySet(ob1["LOC"] + "_LAYERS", charid, ob1["COV"]);
		mySet(ob1["LOC"] + "_AQ", charid, ob1["AQ"]);
		mySet(ob1["LOC"] + "_B", charid, ob1["B"]);
		mySet(ob1["LOC"] + "_E", charid, ob1["E"]);
		mySet(ob1["LOC"] + "_P", charid, ob1["P"]);
		mySet(ob1["LOC"] + "_F", charid, ob1["F"]);

	});



}
function opad(num) {
	return ("0" + num).slice(-2);
}
function getHarnTimeStr(timef) {
	var year = Math.floor(timef / 31104000);
	var month = Math.floor((timef - (year * 31104000)) / 2592000) + 1;
	var mday = Math.floor((timef - (year * 31104000) - ((month - 1) * 2592000)) / 86400) + 1;
	var day = Math.floor((timef - (year * 31104000)) / 86400);
	var hour = Math.floor((timef - (year * 31104000) - (day * 86400)) / 3600);
	var minute = Math.floor((timef - (year * 31104000) - (day * 86400) - (hour * 3600)) / 60);
	var sec = Math.floor(timef - (year * 31104000) - (day * 86400) - (hour * 3600) - (minute * 60));
	return (year + 720).toString() + '-' + month.toString() + '(' + months[(month - 1)] + ')-' + mday.toString() + ' ' + opad(hour.toString()) + ':' + opad(minute.toString()) + ':' + opad(sec.toString());

}
function setHarnTime(args) {
	var seconds = (parseFloat(args[1]) - 720) * 31104000;
	if (args[2]) {
		seconds = seconds + (parseFloat(args[2]) - 1) * 2592000;
	}
	if (args[3]) {
		seconds = seconds + (parseFloat(args[3]) - 1) * 86400;

	}
	if (args[4]) {
		seconds = seconds + parseFloat(args[4]) * 3600;

	}
	if (args[5]) {
		seconds = seconds + parseFloat(args[5]) * 60;

	}
	if (args[6]) {
		seconds = seconds + parseFloat(args[6]);

	}
	state.MainGameNS.GameTime = seconds;
	log(seconds);
}

function makeid() {
	var text = "-";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (var i = 0; i < 19; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}


function myGet(attname, tid, deft) {
	var attribute = findObjs({
		type: 'attribute',
		characterid: tid,
		name: attname
	})[0]
	if (!attribute) {
		attribute = createObj('attribute', {
			characterid: tid,
			name: attname,
			current: deft,
			max: ''
		});
	}

	return attribute.get('current');

}

function mySet(attname, tid, deft) {
	var attribute = findObjs({
		type: 'attribute',
		characterid: tid,
		name: attname
	})[0]
	if (!attribute) {
		attribute = createObj('attribute', {
			characterid: tid,
			name: attname,
			current: deft,
			max: ''
		});
	}
	attribute.set('current', deft);
}

function myGetmax(attname, tid, deft) {
	var attribute = findObjs({
		type: 'attribute',
		characterid: tid,
		name: attname
	})[0]
	if (!attribute) {
		attribute = createObj('attribute', {
			characterid: tid,
			name: attname,
			current: '',
			max: deft
		});
	}
	return attribute.get('max');
}

function mySetmax(attname, tid, deft) {
	var attribute = findObjs({
		type: 'attribute',
		characterid: tid,
		name: attname
	})[0]
	if (!attribute) {
		attribute = createObj('attribute', {
			characterid: tid,
			name: attname,
			current: '',
			max: deft
		});
	}
	attribute.set('max', deft);
}

function getIndex() {
	state.MainGameNS.index++
	return state.MainGameNS.index;
}
function tokemove(toke) {
	var curPage = getObj("page", toke.get("_pageid"));
	var curScale = curPage.get("scale_number"); // scale for 1 unit, eg. 1 unit = 5ft
	var lastmove = toke.get("lastmove");
	var moves = lastmove.split(",");

	var dis = 0;
	for (i = 2; i < moves.length - 1; i = i + 2) {
		dis = dis + pixel2dis(parseFloat(moves[i - 2]), parseFloat(moves[i - 1]), parseFloat(moves[i]), parseFloat(moves[i + 1]));
	}

	dis = dis + pixel2dis(parseFloat(moves[moves.length - 2]), parseFloat(moves[moves.length - 1]), parseFloat(toke.get("left")), parseFloat(toke.get("top")));
	dis = dis * curScale;
	dis = Math.round(dis * 10) / 10;
	return dis;
}
function pixel2dis(left1, top1, left2, top2) {
	var lDist = Math.abs(left1 - left2) / 70;
	var tDist = Math.abs(top1 - top2) / 70;
	var dist = 0;
	dist = Math.sqrt(lDist * lDist + tDist * tDist);
	return dist;
}
function tokendistance(token1, token2) {

	var curPage = getObj("page", token1.get("_pageid"));
	var curScale = curPage.get("scale_number"); // scale for 1 unit, eg. 1 unit = 5ft
	var curUnit = curPage.get("scale_units"); // ft, m, km, mi etc.
	var gridSize = 70;
	var lDist = Math.abs(token1.get("left") - token2.get("left")) / gridSize;
	var tDist = Math.abs(token1.get("top") - token2.get("top")) / gridSize;
	var dist = Math.sqrt(lDist * lDist + tDist * tDist);
	var distSQ = dist;

	dist = dist * curScale;
	dist = Math.round(dist * 10) / 10;
	return [dist, curUnit];
}


function skillList(charid) {

	var slist = [];

	slist.push.apply(slist, autoskillsnames);

	var atts = findObjs({
		_characterid: charid,
		_type: "attribute",
	});

	_.each(atts, function(ob1) {

		ojn = ob1.get('name')
		ojv = ob1.get('current')

		if ((ojv) && (ojn.indexOf("SKILL_NAME") !== -1)) {
			_.each(_.keys(skilllist), function(obj) {
				if (ojv.indexOf(obj) !== -1) {
					slist.push(ojv);
				}
			});
		}
	});
	return slist;
}




function findSkill(char, skillname) {

	var nameout = "False"
	if (skillname.toUpperCase() in autoskills) {
		nameout = skillname.toUpperCase() + "_NAME"
	} else {
		var atts = findObjs({
			_characterid: char.id,
			_type: "attribute",
		});

		_.each(atts, function(ob1) {


			ojn = ob1.get('name')
			ojv = ob1.get('current')

			if (ojn.indexOf("SKILL_NAME") !== -1) {
				_.each(_.keys(skilllist), function(obj) {
					if ((ojv.indexOf(obj) !== -1) && (skillname.indexOf(obj) !== -1)) {
						nameout = ojn;
					}
				});
			}
		});
	}
	if (nameout == "False") {

		_.each(_.keys(skilllist), function(obj) {
			if (skillname.indexOf(obj) !== -1) {
				var mid = makeid();

				if (skilllist[obj]["type"] == "PHYSICAL") {
					mySet("repeating_physicalskill_" + mid + "_PHYSICALSKILL_NAME", char.id, obj);
					mySet("repeating_physicalskill_" + mid + "_PHYSICALSKILL_SB", char.id, 0);
					mySet("repeating_physicalskill_" + mid + "_PHYSICALSKILL_ML", char.id, 0);
					nameout = "repeating_physicalskill_" + mid + "_PHYSICALSKILL_NAME";
				} else if (skilllist[obj]["type"] == "LORE") {
					mySet("repeating_loreskill_" + mid + "_LORESKILL_NAME", char.id, obj);
					mySet("repeating_loreskill_" + mid + "_LORESKILL_SB", char.id, 0);
					mySet("repeating_loreskill_" + mid + "_LORESKILL_ML", char.id, 0);
					nameout = "repeating_loreskill_" + mid + "_LORESKILL_NAME";
				} else if (skilllist[obj]["type"] == "MAGIC") {
					mySet("repeating_magicskill_" + mid + "_MAGICSKILL_NAME", char.id, obj);
					mySet("repeating_magicskill_" + mid + "_MAGICSKILL_SB", char.id, 0);
					mySet("repeating_magicskill_" + mid + "_MAGICSKILL_ML", char.id, 0);
					nameout = "repeating_magicskill_" + mid + "_MAGICSKILL_NAME";
				} else if (skilllist[obj]["type"] == "COMBAT") {
					mySet("repeating_combatskill_" + mid + "_COMBATSKILL_NAME", char.id, obj);
					mySet("repeating_combatskill_" + mid + "_COMBATSKILL_SB", char.id, 0);
					mySet("repeating_combatskill_" + mid + "_COMBATSKILL_ML", char.id, 0);
					nameout = "repeating_combatskill_" + mid + "_COMBATSKILL_NAME";
				} else if (skilllist[obj]["type"] == "COMMUNICATION") {
					mySet("repeating_communicationskill_" + mid + "_COMMUNICATIONSKILL_NAME", char.id, obj);
					mySet("repeating_communicationskill_" + mid + "_COMMUNICATIONSKILL_SB", char.id, 0);
					mySet("repeating_communicationskill_" + mid + "_COMMUNICATIONSKILL_ML", char.id, 0);
					nameout = "repeating_communicationskill_" + mid + "_COMMUNICATIONSKILL_NAME";
				} else if (skilllist[obj]["type"] == "RITUAL") {
					mySet("repeating_ritualskill_" + mid + "_RITUALSKILL_NAME", char.id, obj);
					mySet("repeating_ritualskill_" + mid + "_RITUALSKILL_SB", char.id, 0);
					mySet("repeating_ritualskill_" + mid + "_RITUALSKILL_ML", char.id, 0);
					nameout = "repeating_ritualskill_" + mid + "_RITUALSKILL_NAME";
				}
			}
		});

	}

	return nameout;
}


function calcSB(char, msg) {


	var rolls = ["STR", "STA", "DEX", "AGL", "INT", "AUR", "WIL", "EYE", "HRG", "SML", "VOI", "CML", "FRAME"]
	_.each(rolls, function(attname) {
		var r = randomInteger(6) + randomInteger(6) + randomInteger(6);
		myGet(attname, char.id, r);
	});

	_.each(_.keys(autoskills), function(skillname) {

		myGet(skillname + "_SB", char.id, 1);
	});



	var atts = findObjs({
		_characterid: char.id,
		_type: "attribute",
	});
	var sss = myGet('SUNSIGN', char.id, "Ulandus").split('-');

	_.each(atts, function(ob1) {


		ojn = ob1.get('name')
		ojv = ob1.get('current')

		if (ojn.indexOf("SKILL_NAME") !== -1) {

			_.each(_.keys(skilllist), function(obj) {
				if (ojv.indexOf(obj) !== -1) {
					var sb = Math.round(((Number(myGet(skilllist[obj]["sba"][0], char.id)) + Number(myGet(skilllist[obj]["sba"][1], char.id)) + Number(myGet(skilllist[obj]["sba"][2], char.id))) / 3));
					var sb1 = 0;
					var sb2 = 0;
					if (sss.length == 2) {

						if (sss[0].slice(0, 3) in skilllist[obj]["ssm"]) {
							sb1 = Number(skilllist[obj]["ssm"][sss[0].slice(0, 3)])
						}
						if (sss[1].slice(0, 3) in skilllist[obj]["ssm"]) {
							sb2 = Number(skilllist[obj]["ssm"][sss[1].slice(0, 3)])
						}
						if (sb1 > sb2) {
							sb += sb1;
						} else {
							sb += sb2;
						}

					} else {
						if (sss[0].slice(0, 3) in skilllist[obj]["ssm"]) {
							sb = sb + Number(skilllist[obj]["ssm"][sss[0].slice(0, 3)])
						}
					}

					log(obj + " - " + Math.round(sb))
					if (msg.content.indexOf("?") !== -1) {
						myGet(ojn.slice(0, -4) + "SB", char.id, sb);
					}
					else {
						mySet(ojn.slice(0, -4) + "SB", char.id, sb);
					}
					var ml = parseInt(myGet(ojn.slice(0, -4) + "ML", char.id, 0));

					if ((!ml) || (ml == 0)) {
						if (skilllist[obj]["oml"]) {
							mySet(ojn.slice(0, -4) + "ML", char.id, (sb * parseInt(skilllist[obj]["oml"])))
						}
					} else if ((parseInt(ml) > 0) && (parseInt(ml) < sb)) {
						if (skilllist[obj]["oml"]) {
							mySet(ojn.slice(0, -4) + "ML", char.id, (sb * parseInt(ml)))
						}
					}
				}
			});
		}
		if (ojn.indexOf("_SB") !== -1) {

			_.each(_.keys(skilllist), function(obj) {
				if (ojn.indexOf(obj) !== -1) {
					var sb = Math.round(((Number(myGet(skilllist[obj]["sba"][0], char.id)) + Number(myGet(skilllist[obj]["sba"][1], char.id)) + Number(myGet(skilllist[obj]["sba"][2], char.id))) / 3));
					var sb1 = 0;
					var sb2 = 0;

					if (sss.length == 2) {
						if (sss[0].slice(0, 3) in skilllist[obj]["ssm"]) {
							sb1 = Number(skilllist[obj]["ssm"][sss[0].slice(0, 3)])
						}
						if (sss[1].slice(0, 3) in skilllist[obj]["ssm"]) {
							sb2 = Number(skilllist[obj]["ssm"][sss[1].slice(0, 3)])
						}
						if (sb1 > sb2) {
							sb += sb1
						} else {
							sb += sb2
						}
					} else {
						if (sss[0].slice(0, 3) in skilllist[obj]["ssm"]) {
							sb = sb + Number(skilllist[obj]["ssm"][sss[0].slice(0, 3)])
						}
					}
					if (msg.content.indexOf("?") !== -1) {
						myGet(ojn, char.id, sb);
					}
					else {
						mySet(ojn, char.id, sb);
					}
					var ml = parseInt(myGet(ojn.slice(0, -2) + "ML", char.id, 0));

					if ((!ml) || (ml == 0)) {
						if (skilllist[obj]["oml"]) {
							mySet(ojn.slice(0, -2) + "ML", char.id, (sb * parseInt(skilllist[obj]["oml"])))
						}
					} else if ((parseInt(ml) > 0) && (parseInt(ml) < sb)) {
						if (skilllist[obj]["oml"]) {
							mySet(ojn.slice(0, -2) + "ML", char.id, (sb * parseInt(ml)))
						}
					}

				}

			});

		}

	});
	sendChat('H&acirc;rn API', "/w gm done calc SB");
}


function out(charid) {


	var char = getObj("character", charid);
	var atts = findObjs({
		_characterid: charid,
		_type: "attribute",

	});
	log("=================================")
	_.each(atts, function(ob1) {
		ojn = ob1.get('name')
		ojv = ob1.get('current')
		log(ojn + " - " + ojv)


	});
}
function invin(charid) {
	var char = getObj("character", charid);
	var atts = findObjs({
		_characterid: charid,
		_type: "attribute",
		name: "TEXTAREA_NOTE"
	});

	if (atts[0]) {
		log("=================================")
		ojv = atts[0].get('current');
		log(atts[0]);
		if (ojv.length > 100) {
			ojv = ojv.replace(/\t/g, "")
			for (i = 0; i < 10; i++) {
				ojv = ojv.replace(/  /g, " ")
			}

			ojv = ojv.replace(/\n /g, "\n");
			ojv = ojv.replace(/\nOffspring:/g, "");
			ojv = ojv.replace(/\nOrphan:/g, "");
			lns = ojv.split("\n");



			var tv = lns[1].split(" ");
			var xi = 0;

			if (lns[xi].slice(0, 15) == "Clothing/Armor:") {
				lns[xi] = lns[xi].slice(16);
				while ((lns[xi].slice(0, 8) !== "Weapons:") && (lns[xi].slice(0, 6) !== "Notes:")) {
					if (lns[xi].length > 2) { addArmor(charid, lns[xi]); }
					xi++;


				}

			}

			if (lns[xi].slice(0, 8) == "Weapons:") {
				lns[xi] = lns[xi].slice(9);
				while ((lns[xi].slice(0, 10) !== "Equipment:") && (lns[xi].slice(0, 6) !== "Notes:")) {
					if (lns[xi].length > 2) { addWeapon(charid, lns[xi]); }
					xi++;
				}


			}

			if (lns[xi].slice(0, 10) == "Equipment:") {
				lns[xi] = lns[xi].slice(11);
				while (lns[xi].slice(0, 6) !== "Notes:") {
					if (lns[xi].length > 2) { addItem(charid, lns[xi]); }
					xi++;
				}
			}
		}
	}
}
function xin(charid) {
	var char = getObj("character", charid);
	var atts = findObjs({
		_characterid: charid,
		_type: "attribute",
		name: "TEXTAREA_NOTE"
	});

	if (atts[0]) {
		log("=================================")
		ojv = atts[0].get('current');
		//log(atts[0]);
		if (ojv.length > 100) {
			ojv = ojv.replace(/\t/g, "")
			for (i = 0; i < 10; i++) {
				ojv = ojv.replace(/  /g, " ")
			}

			ojv = ojv.replace(/\n /g, "\n");
			ojv = ojv.replace(/\nOffspring:/g, "");
			ojv = ojv.replace(/\nOrphan:/g, "");
			lns = ojv.split("\n");



			var tv = lns[1].split(" ");
			if (tv[0] !== "Strength") {
				log("no");
			} else {
				mySet("NAME", charid, lns[0]);
				mySet("STR", charid, parseInt(tv[1]));
				mySet("AGL", charid, parseInt(tv[3]));
				mySet("SML", charid, parseInt(tv[5]));
				mySet("WIL", charid, parseInt(tv[7]));
				mySet("CML", charid, parseInt(tv[9]));
				var tv = lns[2].split(" ");
				mySet("STA", charid, parseInt(tv[1]));
				mySet("EYE", charid, parseInt(tv[3]));
				mySet("VOI", charid, parseInt(tv[5]));
				mySet("AUR", charid, parseInt(tv[7]));
				mySet("END", charid, parseInt(tv[9]));
				var tv = lns[3].split(" ");
				mySet("DEX", charid, parseInt(tv[1]));
				mySet("HRG", charid, parseInt(tv[3]));
				mySet("INT", charid, parseInt(tv[5]));
				mySet("MORAL", charid, parseInt(tv[7]));
				mySet("SPECIES", charid, lns[4].slice(9));

				mySet("GENDER", charid, lns[5].slice(5));
				mySet("BIRTHDATE", charid, (lns[7].slice(12) + " " + lns[8].slice(11) + ", " + lns[9].slice(12)));
				mySet("SUNSIGN", charid, lns[10].slice(10, -1));
				mySet("AGE", charid, lns[6].slice(5));
				mySet("PIETY", charid, lns[28].slice(7));
				mySet("HEIGHT", charid, lns[18].slice(8));
				mySet("FRAME", charid, lns[19].slice(7));
				mySet("WEIGHT", charid, lns[20].slice(8));
				mySet("COMPLEXION", charid, lns[23].slice(12));
				mySet("HAIR_COLORS", charid, lns[24].slice(12));
				mySet("EYE_COLOR", charid, lns[25].slice(11));
				mySet("CULTURE", charid, lns[11].slice(9));
				mySet("SOCIAL_CLASS", charid, lns[12].slice(13));
				mySet("SIBLING_RANK", charid, lns[13].slice(13));
				mySet("PARENT", charid, lns[15].slice(11));
				mySet("ESTRANGEMENT", charid, lns[16].slice(13));
				mySet("CLANHEAD", charid, lns[17].slice(10));





				var xi = 26;
				while (lns[xi].indexOf("Physical Skills:") == -1) {
					if (lns[xi].indexOf("Occupation:") !== -1) {
						char.set("name", lns[xi].slice(12) + getIndex())
						mySet("OCCUPATION", charid, lns[xi].slice(12));
					}
					if (lns[xi].indexOf("Medical:") !== -1) {
						mySet("PHYSICAL", charid, lns[xi].slice(9));
					}
					if (lns[xi].indexOf("Psyche:") !== -1) {
						mySet("MENTAL", charid, lns[xi].slice(8));
					}
					if (lns[xi].indexOf("Diety:") !== -1) {
						mySet("DIETY", charid, lns[xi].slice(7));
						var diety = lns[xi].slice(7);
					}
					if (lns[xi].indexOf("Piety:") !== -1) {
						mySet("PIETY", charid, lns[xi].slice(7));
					}

					xi++;
				}
				xi++;

				while (lns[xi] !== "Communications Skills:") {
					tv = lns[xi].replace(/ /g, "").split("/");
					if (tv.length > 1) {
						if (tv[0] in autoskills) {
							tv2 = tv[1].split("(SB:");
							tv3 = tv2[1].split(")OML:");
							mySet(tv[0] + "_SB", charid, tv3[0])
							mySet(tv[0] + "_ML", charid, tv2[0])


						} else {
							var tv2 = tv[1].split("(SB:");
							var tv3 = tv2[1].split(")OML:");
							var mid = makeid();
							mySet("repeating_physicalskill_" + mid + "_PHYSICALSKILL_NAME", charid, tv[0]);
							mySet("repeating_physicalskill_" + mid + "_PHYSICALSKILL_SB", charid, tv3[0]);
							mySet("repeating_physicalskill_" + mid + "_PHYSICALSKILL_ML", charid, tv2[0]);
						}
					}
					xi++
				}


				xi++;
				while (lns[xi] !== "Combat Skills:") {
					var stv = lns[xi].replace(/ /g, "")
					var tv = stv.split("/");
					if (tv.length > 1) {
						if (tv[0] in autoskills) {
							var tv2 = tv[1].split("(SB:");
							var tv3 = tv2[1].split(")OML:");
							mySet(tv[0] + "_SB", charid, tv3[0])
							mySet(tv[0] + "_ML", charid, tv2[0])

						} else {
							var tv2 = tv[1].split("(SB:");
							var tv3 = tv2[1].split(")OML:");
							var mid = makeid();
							mySet("repeating_communicationskill_" + mid + "_COMMUNICATIONSKILL_NAME", charid, tv[0]);
							mySet("repeating_communicationskill_" + mid + "_COMMUNICATIONSKILL_SB", charid, tv3[0]);
							mySet("repeating_communicationskill_" + mid + "_COMMUNICATIONSKILL_ML", charid, tv2[0]);
						}
					}
					xi++
				}

				xi++;
				while (lns[xi] !== "Crafts & Lore Skills:") {
					tv = lns[xi].replace(/ /g, "").split("/");
					if (tv.length > 1) {
						if (tv[0] in autoskills) {
							tv2 = tv[1].split("(SB:");
							tv3 = tv2[1].split(")OML:");
							mySet(tv[0] + "_SB", charid, tv3[0])
							mySet(tv[0] + "_ML", charid, tv2[0])


						} else {
							var tv2 = tv[1].split("(SB:");
							var tv3 = tv2[1].split(")OML:");
							var mid = makeid();
							mySet("repeating_combatskill_" + mid + "_COMBATSKILL_NAME", charid, tv[0]);
							mySet("repeating_combatskill_" + mid + "_COMBATSKILL_SB", charid, tv3[0]);
							mySet("repeating_combatskill_" + mid + "_COMBATSKILL_ML", charid, tv2[0]);
						}
					}
					xi++
				}


				xi++;


				while (lns[xi] !== "Convocaton Skills:") {
					tv = lns[xi].replace(/ /g, "").split("/");

					if (tv.length > 1) {
						var tv2 = tv[1].split("(SB:");
						var tv3 = tv2[1].split(")OML:");
						var mid = makeid();
						mySet("repeating_loreskill_" + mid + "_LORESKILL_NAME", charid, tv[0]);
						mySet("repeating_loreskill_" + mid + "_LORESKILL_SB", charid, tv3[0]);
						mySet("repeating_loreskill_" + mid + "_LORESKILL_ML", charid, tv2[0]);
					}
					xi++
				}

				xi++;

				while (lns[xi] !== "Psionics Skills:") {
					tv = lns[xi].replace(/ /g, "").split("/");

					if (tv.length > 1) {
						var tv2 = tv[1].split("(SB:");
						var tv3 = tv2[1].split(")OML:");
						var mid = makeid();
						mySet("repeating_magicskill_" + mid + "_MAGICSKILL_NAME", charid, tv[0]);
						mySet("repeating_magicskill_" + mid + "_MAGICSKILL_SB", charid, tv3[0]);
						mySet("repeating_magicskill_" + mid + "_MAGICSKILL_ML", charid, tv2[0]);
					}
					xi++
				}

				xi++;


				while (lns[xi] !== "Ritual Skills:") {
					tv = lns[xi].replace(/ /g, "").split("/");
					if (tv.length > 1) {
						var tv2 = tv[1].split("(SB:");
						var tv3 = tv2[1].split(")OML:");
						var mid = makeid();
						mySet("repeating_psionics_" + mid + "_TALENT_NAME", charid, tv[0]);
						mySet("repeating_psionics_" + mid + "_TALENT_FATIGUE", charid, "0");
						mySet("repeating_psionics_" + mid + "_TALENT_TIME", charid, "0");
						mySet("repeating_psionics_" + mid + "_TALENT_EML", charid, tv2[0]);
						mySet("repeating_psionics_" + mid + "_TALENT_NOTE", charid, lns[xi]);

					}


					xi++
				}

				xi++;

				while ((lns[xi].slice(0, 6) !== "Money:") && (lns[xi].slice(0, 7) !== "Spells:") && (lns[xi].slice(0, 12) !== "Invocations:")) {
					tv = lns[xi].replace(/ /g, "").split("/");

					if (tv.length > 1) {
						var tv2 = tv[1].split("(SB:");
						var tv3 = tv2[1].split(")OML:");
						var mid = makeid();
						mySet("repeating_ritualskill_" + mid + "_RITUALSKILL_NAME", charid, tv[0]);
						mySet("repeating_ritualskill_" + mid + "_RITUALSKILL_SB", charid, tv3[0]);
						mySet("repeating_ritualskill_" + mid + "_RITUALSKILL_ML", charid, tv2[0]);
					}


					xi++
				}
				if (lns[xi].slice(0, 12) == "Invocations:") {
					lns[xi] = lns[xi].slice(12);
					while (lns[xi].slice(0, 6) !== "Money:") {
						tv = lns[xi].split("/");
						if (tv.length > 1) {

							var mid = makeid();
							mySet("repeating_rituals_" + mid + "_RITUAL_NAME", charid, tv[0]);
							mySet("repeating_rituals_" + mid + "_RITUAL_RELIGION", charid, diety);
							mySet("repeating_rituals_" + mid + "_RITUAL_LEVEL", charid, tv[1]);
							mySet("repeating_rituals_" + mid + "_RITUAL_ML", charid, 0);
							mySet("repeating_rituals_" + mid + "_RITUAL_EML", charid, 0);
							mySet("repeating_rituals_" + mid + "_RITUAL_NOTE", charid, lns[xi]);

						}


						xi++
					}

				}
				if (lns[xi].slice(0, 7) == "Spells:") {
					lns[xi] = lns[xi].slice(7);
					while (lns[xi].slice(0, 6) !== "Money:") {
						tv = lns[xi].split("/");
						if (tv.length > 1) {

							var mid = makeid();
							mySet("repeating_spells_" + mid + "_SPELL_NAME", charid, tv[0]);
							mySet("repeating_spells_" + mid + "_SPELL_CONVOCATION", charid, "");
							mySet("repeating_spells_" + mid + "_SPELL_LEVEL", charid, tv[1]);
							mySet("repeating_spells_" + mid + "_SPELL_ML", charid, 0);
							mySet("repeating_spells_" + mid + "_SPELL_EML", charid, 0);
							mySet("repeating_spells_" + mid + "_SPELL_NOTE", charid, "");


						}


						xi++
					}

				}
				if (lns[xi].slice(0, 6) == "Money:") {
					var mid = makeid();
					mySet("repeating_inventoryitems_" + mid + "_INVENTORY_NAME", charid, lns[xi]);
					mySet("repeating_inventoryitems_" + mid + "_INVENTORY_WGT", charid, parseFloat(lns[xi].split(":")[1].slice(0, -1)) / 240);
				}
				xi++;
				if (lns[xi].slice(0, 15) == "Clothing/Armor:") {
					lns[xi] = lns[xi].slice(16);
					while ((lns[xi].slice(0, 8) !== "Weapons:") && (lns[xi].slice(0, 6) !== "Notes:")) {
						addItem(charid, lns[xi]);
						xi++;


					}

				}

				if (lns[xi].slice(0, 8) == "Weapons:") {
					lns[xi] = lns[xi].slice(9);
					while ((lns[xi].slice(0, 10) !== "Equipment:") && (lns[xi].slice(0, 6) !== "Notes:")) {
						addWeapon(charid, lns[xi]);
						xi++;
					}


				}

				if (lns[xi].slice(0, 10) == "Equipment:") {
					lns[xi] = lns[xi].slice(11);
					while (lns[xi].slice(0, 6) !== "Notes:") {
						addItem(charid, lns[xi]);

						xi++;


					}
				}
			}
		}
	}
}




function replaceArg(acom, msg) {
	var args = msg.content.split(" ");
	for (var i = 0; i < acom.length; i++) {
		if (acom[i].indexOf('args') == 0) {
			acom[i] = args[parseInt(acom[i].substr(4))];

		}
		if (acom[i].indexOf('inline') == 0) {
			acom[i] = msg.inlinerolls[parseInt(acom[i].substr(6))].results.total;
		}

	}
	return acom;

}


function handle_table(args, msg) {
	var scdata = findObjs({
		name: args[1],
		_type: "handout",
	})[0];
	scdata.get("notes", function(scda) {

		var tt1 = scda.substring(22, scda.indexOf('</td></tr></tbody></table>'));
		var tt2 = tt1.split('</td></tr><tr><td>');
		var tt3 = [];
		for (var i = 0; i < tt2.length; i++) {
			tt3[i] = tt2[i].split('</td><td>')
		}
		log("p")
		var r1 = msg.inlinerolls[0].results.total;
		var r2 = msg.inlinerolls[1].results.total;
		var i1 = tt3.length - 1;
		var i2 = tt3[0].length - 1;
		for (var i = 2; i < tt3.length; i++) {
			if (r1 <= parseInt(tt3[i][0])) {
				i1 = i;
				break;
			}
		}
		for (var i = 1; i < tt3[0].length; i++) {
			if (r2 <= parseInt(tt3[0][i])) {
				i2 = i;
				break;
			}
		}
		var description = tt3[i1][i2].split(';');
		var out = '&{template:default} {{name=' + args[1] + '}} {{Rolls=' + r1.toString() + ' ' + r2.toString() + '}} {{' + tt3[1][i2] + '= ' + description[0] + '}}';
		sendChat(msg.who, out);
		if (args[4] && description[1]) {
			log(args[4]);
			for (var i = 1; i < description.length; i++) {
				commandLine = replaceArg(description[i].split(' '), msg);
				if (commandLine[0] == 'add') {
					if (Number(commandLine[2])) {
						var newVal = Number(myGet(commandLine[1], args[4], 0)) + Number(commandLine[2]);
					} else {
						var newVal = myGet(commandLine[1], args[4], 0) + " " + commandLine[2];
					}
					mySet(commandLine[1], args[4], newVal);
				}
				if (commandLine[0] == 'addmax') {
					var newVal = Number(myGetmax(commandLine[1], args[4], 0)) + Number(commandLine[2]);
					mySetmax(commandLine[1], args[4], newVal);
				}
				if (commandLine[0] == 'set') {
					mySet(commandLine[1], args[4], commandLine[2]);
					log(commandLine[1]);
				}
				if (commandLine[0] == 'setmax') {
					mySet(commandLine[1], args[4], commandLine[2]);
				}
				if (commandLine[0] == 'say') {
					var out = commandLine[1];
					for (var j = 2; j < commandLine.length; j++) {
						out = out + ' ' + commandLine[j];
					}

					sendChat(args[1], out);
				}
			}
		}
	});
}


function chatParser(msg) {

	// check for and log crits
	if (msg.content.startsWith(" {{character_name=")) {
		var d = new Date();
		var n = d.toLocaleString();
		if (msg.content.includes("rolldesc=rolls ")) {
			if (msg.inlinerolls[3].results.total % 5 == 0) {
				var char = getCharByNameAtt(msg.content.slice((msg.content.indexOf("character_name") + 15), msg.content.indexOf("}} ")));

				if (msg.inlinerolls[1].results.total >= msg.inlinerolls[3].results.total) {
					charLog(char.id, ": CS "
						+ msg.content.slice(msg.content.indexOf("rolldesc=rolls ") + 15,
							msg.content.indexOf("}} ", msg.content.indexOf("rolldesc=rolls "))), state.Harn.config.realtime, state.Harn.config.gametime)
				} else {
					charLog(char.id, ": CF "
						+ msg.content.slice(msg.content.indexOf("rolldesc=rolls ") + 15,
							msg.content.indexOf("}} ", msg.content.indexOf("rolldesc=rolls "))), state.Harn.config.realtime, state.Harn.config.gametime)
				}
			}
		} else if (msg.content.includes("rolldesc=performs ")) {
			if (msg.inlinerolls[7].results.total % 5 == 0) {
				var char = getCharByNameAtt(msg.content.slice((msg.content.indexOf("character_name") + 15), msg.content.indexOf("}} ")));

				if (msg.inlinerolls[4].results.total >= msg.inlinerolls[7].results.total) {
					charLog(char.id, ": CS "
						+ msg.content.slice(msg.content.indexOf("rolldesc=performs ") + 18,
							msg.content.indexOf("}} ", msg.content.indexOf("rolldesc=performs "))), state.Harn.config.realtime, state.Harn.config.gametime)
				} else {
					charLog(char.id, ": CF "
						+ msg.content.slice(msg.content.indexOf("rolldesc=performs ") + 18,
							msg.content.indexOf("}} ", msg.content.indexOf("rolldesc=performs "))), state.Harn.config.realtime, state.Harn.config.gametime)
				}
			}
		} else if (msg.content.includes("rolldesc=casts ")) {
			if (msg.inlinerolls[7].results.total % 5 == 0) {
				var char = getCharByNameAtt(msg.content.slice((msg.content.indexOf("character_name") + 15), msg.content.indexOf("}} ")));

				if (msg.inlinerolls[4].results.total >= msg.inlinerolls[7].results.total) {
					charLog(char.id, ": CS "
						+ msg.content.slice(msg.content.indexOf("rolldesc=casts ") + 15,
							msg.content.indexOf("}} ", msg.content.indexOf("rolldesc=casts "))), state.Harn.config.realtime, state.Harn.config.gametime)
				} else {
					charLog(char.id, ": CF "
						+ msg.content.slice(msg.content.indexOf("rolldesc=casts ") + 15,
							msg.content.indexOf("}} ", msg.content.indexOf("rolldesc=casts "))), state.Harn.config.realtime, state.Harn.config.gametime)
				}
			}
		}
	}
}

function doHit(base, atkrepwep, acharid, dcharid, aspect, missi, loc, atktoke, deftoke) {


	var atk_impact = getImpact(base, atkrepwep, acharid, aspect, missi);


	var hitloc = gethitloc(randomInteger(100), hit_loc_penalty[loc]["index"]);

	var avatloc = myGet(hitloc + "_" + atk_impact.aspect, dcharid, 0);

	var out = "<br/>" + atktoke.get('name') + " damages " + deftoke.get('name') + "<br>Impact: "
		+ labelMaker(atk_impact.total, atk_impact.impactstr) + "<br/>Location: "
		+ hitloc + "<br/>AV at Loc: " + avatloc
		+ "<br/>Effective Impact: " + Math.max(atk_impact.total - avatloc,0);
	if (atk_impact.total - avatloc > 0) {
		var eff = gethiteff(hitloc, atk_impact.total - avatloc);
		out += "<br/>" + deftoke.get('name') + " Injury: " + eff + " " + atk_impact.aspect
		var unipenalty = parseInt(eff.match(/\d/));

		if (deftoke.get('bar3_link')) {
			var unipenalty = unipenalty + parseInt(myGet('UNIVERSAL_PENALTY', dcharid, 0));
			deftoke.set('bar3_value', unipenalty);
			addinjury(atk_impact.aspect + " " + hitloc, eff, dcharid)
		} else if (deftoke.get('bar3_value')) {
			var unipenalty = unipenalty + parseInt(deftoke.get('bar3_value'));
			deftoke.set('bar3_value', unipenalty);
		} else {
			var unipenalty = unipenalty + parseInt(myGet('UNIVERSAL_PENALTY', dcharid, 0));
			deftoke.set('bar3_value', unipenalty);
		}

		out += rollshock(dcharid, deftoke, unipenalty)

	}
	return out;

}


function defendTemplate(template, rolldesc, rollresult, rolltarget, rollsuccess, drollresult, drolltarget, drollsuccess, aresult, dresult, result) {

	var out = `&{template:${template}} \
{{rolldesc=${rolldesc}}} \
{{rollresult=${rollresult}}} \
{{rolltarget=${rolltarget}}} \
{{rollsuccess=[[${rollsuccess}]]}} \
{{aresult=${aresult}}} \
{{dresult=${dresult}}} \
{{result=${result}}}`;
	if (drollsuccess < 4) {
		out += `{{drollresult=${drollresult}}} \
{{drolltarget=${drolltarget}}} \
{{drollsuccess=[[${drollsuccess}]]}} `;
	}
	return out;
}





