const Discord = require("discord.js");
const client = new Discord.Client();
const randomInt = require('random-int');
const yt = require('ytdl-core');
const fs = require("fs");
var MongoClient = require('mongodb').MongoClient;
var url = process.env.MONGO_URL;

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  db.createCollection("joinableroles", function(err, res) {
    if (err) throw err;
    console.log("Table created!");
    db.close();
  });
}); 

const guildID = process.env.ID_GUILD;
 
const newID = process.env.ID_ROLE_NEW;
const readyID = process.env.ID_ROLE_READY;
const SFWID = process.env.ID_ROLE_SFW;
const trustedID = process.env.ID_ROLE_TRUSTED;
const modID = process.env.ID_ROLE_MOD;
const adminID = process.env.ID_ROLE_ADMIN;
 
const newcomerChannelID = process.env.ID_CHANNEL_NEWCOMERS;
const joinleaveChannelID = process.env.ID_CHANNEL_JOINLEAVE;
const manualApprovalChannelID = process.env.ID_CHANNEL_MANUALAPPROVAL;
const welcomeAndRulesChannelID = process.env.ID_CHANNEL_WELCOMEANDRULES;
const worksafeGeneralChannelID = process.env.ID_CHANNEL_WORKSAFEGENERAL;
const nsfwGeneralChannelID = process.env.ID_CHANNEL_NSFWGENERAL;
const roleRequestChannelID = process.env.ID_CHANNEL_ROLEREQUEST;
const botChannelID = process.env.ID_CHANNEL_BOT;

const readylog = process.env.READY_LOG;
const prefix = process.env.PREFIX;
var passes = 1;
 
var raid = false;
var switched = false;
 
client.on('ready', () => {
    console.log(readylog);
    client.user.setGame("hypnosis files");
});


let queue = {};
queue[guildID] = {};
queue[guildID].playing = false;
queue[guildID].songs = [];

const musicCommands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.send(`Add some songs to the queue first with ${prefix}add`);
		if (!msg.guild.voiceConnection) return musicCommands.join(msg).then(() => musicCommands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.send('Already Playing');
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(`Now playing ${song.title}\nRequested by ${song.requester}.\n`);
			if (song === undefined) return msg.channel.send('Queue is empty').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.send(`Playing: **${song.title}** as requested by: **${song.requester}**`);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('collect', m => {
				if (m.content.startsWith(prefix + 'pause')) {
					msg.channel.send('paused').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(prefix + 'resume')){
					msg.channel.send('resumed').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(prefix + 'skip')){
					console.log('skipping! songs.length = ' + queue[msg.guild.id].songs.length);
					if (queue[msg.guild.id].songs.length == 1) {
						msg.channel.send(`There's no song to skip to!`);
					} else {
						msg.channel.send('skipped').then(() => {dispatcher.end();});
					}
				} else if (m.content.startsWith(prefix + 'volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(prefix + 'volume-')){
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(prefix + 'time')){
					msg.channel.send(`time: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}`);
				}
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.send('error: ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		})(queue[msg.guild.id].songs.shift());
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t connect to your voice channel...');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'add': (msg) => {
		let url = msg.content.split(' ')[1];
		if (url == '' || url === undefined) return msg.channel.send(`You must add a YouTube video url, or id after ${prefix}add`);
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.send('Invalid YouTube Link: ' + err);
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.send(`added **${info.title}** to the queue`);
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.send(`Add some songs to the queue first with ${prefix}add`);
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);});
		msg.channel.send(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'hypnoqueue': (msg) => {
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=JO98V-w4ghM', title: '2017-05-14 Transformation Session 1', requester: 'PosiBot'});
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=tsiEoiwYZQQ', title: '2017-05-17 Transformation Session 2', requester: 'PosiBot'});
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=CULTVCodw1k', title: '2017-05-23 Lucid dreaming session 1', requester: 'PosiBot'});
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=2NEKTBawiVs', title: '2017-05-30 Anxiety reduction session 1', requester: 'PosiBot'});
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=U69aeFgcpWg', title: '2017-05-31 Imposition session 1', requester: 'PosiBot'});
		msg.channel.send(`added **some recorded live hypno sessions** to the queue`);
	},
	'musichelp': (msg) => {
		msg.channel.send(`Use these commands only in ${client.channels.get(botChannelID)}`);
		let tosend = ['```xl', prefix + 'join : "Join Voice channel of msg sender"',
		prefix + 'add : "Add a valid youtube link to the queue"',
		prefix + 'queue : "Shows the current queue, up to 15 songs shown."',
		prefix + 'hypnoqueue : "Add a bunch of recorded live hypno sessions to the queue."',
		prefix + 'play : "Play the music queue if already joined to a voice channel"',
		'', 'the following commands only function while the play command is running:'.toUpperCase(),
		prefix + 'pause : "pauses the music"',	prefix + 'resume : "resumes the music"',
		prefix + 'skip : "skips the playing song"',
		prefix + 'time : "Shows the playtime of the song."',
		prefix + 'volume+(+++) : "increases volume by 2%/+"',
		prefix + 'volume-(---) : "decreases volume by 2%/-"',	'```'];
		msg.channel.send(tosend.join('\n'));
	},
	'reboot': (msg) => {
		if (msg.author.id == adminID) process.exit(); //Requires a node module like Forever to work.
	}
};

const rpCommands = {
	'boop': (message, args) => {
		if (isMention(args[0])) {
			message.channel.send(`*boops ${mentiontorawName(args[0])}*`);
		}
	},
	'bap': (message, args) => {
		if (isMention(args[0])) {
			message.channel.send(`*baps ${mentiontorawName(args[0])}*`);
		}
	},
	'hug': (message, args) => {
		if (isMention(args[0])) {
			message.channel.send(`*hugs ${mentiontorawName(args[0])}*`);
		}
	},
	'snuggle': (message, args) => {
		if (isMention(args[0])) {
			message.channel.send(`*snuggles ${mentiontorawName(args[0])}*`);
		}
	},
	'jape': (message, args) => {
		if (isMention(args[0])) {
			message.channel.send(`*Pulls the wool over ${mentiontorawName(args[0])}'s eyes*`);
		}
	},
	'slap': (message, args) => {
		if (isMention(args[0])) {
			message.channel.send(`*slaps ${mentiontorawName(args[0])}*`);
		}
	},
	'rape': (message, args) => {
		if (isMention(args[0])) {
			var randomRape = [`*takes ${mentiontorawName(args[0])} to a fancy restaurant*`,
                        `*comforts ${mentiontorawName(args[0])} and takes them to see a therapist*`];
			var pick = randomInt(randomRape.length - 1);
			message.channel.send(randomRape[pick]);
		}
	},
	'roundhouse': (message, args) => {
		if (isMention(args[0])) {
			message.channel.send(`*Roundhouses ${mentiontorawName(args[0])}, Right in the noggin!*`);
		}
	},
	'doot': (message, args) => {
		if (isMention(args[0])) {
			message.channel.send(`*doots her trumpet at ${mentiontorawName(args[0])}!*`);
		} else {
			message.channel.send(`*doots her trumpet!* ^^`);
		}
	},
	'8ball': (message, args) => {
        var random8ball = [`It is certain.`, `It is decidedly so.`, `Without a doubt.`, `Yes definitely.`, `You may rely on it.`,
			`As I see it, yes.`, `Most likely.`, `Outlook good.`, `Yes.`, `Signs point to yes.`, `Reply hazy try again.`,
			`Better not tell you now.`, `Cannot predict now.`, `Concentrate and ask again.`, `Don't count on it.`, `My reply is no.`,
			`My sources say no.`, `Outlook not so good.`, `Very doubtful.`];
        var pick = randomInt(random8ball.length - 1);
        message.channel.send(random8ball[pick]);
	},
	'dice': (message, args) => {
		if ((parseInt(args[0]) != NaN) && (parseInt(args[0]) < 101) && (parseInt(args[0]) > 0)) {
			var pick = randomInt(args[0] - 1);
			message.channel.send(`I rolled a ${args[0]}-sided die and got ${pick + 1}!`);
		} else {
			message.channel.send('Please use a number from 1 to 100.');
		}
	},
	'rphelp': (message) => {
		let tosend = ['```xl', prefix + 'boop : "Boop \'em!."',
		prefix + 'bap : "Bap \'em!."',
		prefix + 'slap : "Slap \'em!"',
		prefix + '8ball : "I will tell the future for you."',
		prefix + 'doot : "I will play my trumpet."',	
		prefix + 'dice <number> : "Roll a die. Use a number from 1 to 100"','```'];
		message.channel.send(tosend.join('\n'));
	}
};

const joinableRoleCommands = {
	'viewjrs': (message, argsStringResult) => {
		if (joinableroles == []) {
            message.channel.send("There are no joinable roles yet.");
        } else {
            var roleString = "";
            for (var i = 0; i < joinableroles.length; i++) {
                roleString += joinableroles[i] + "\n";
            }
            message.channel.send("The joinable roles are: \n**" + roleString + "**");           
        }
	},
	'jr': (message, argsStringResult) => {
		if (hasRole(message.member, adminID)) {
			if (!argsStringResult) return;
			if (isJoinable(argsStringResult)) {
				removeJoinable(argsStringResult);
				message.channel.send(`${argsStringResult} is now no longer joinable. Type **${message.content}** again to undo.`);
 
			} else if (message.guild.roles.find("name", argsStringResult)) { // is a real role
				if ((message.guild.roles.find("name", argsStringResult).id == adminID) || (message.guild.roles.find("name", argsStringResult).id == modID)) {
					message.channel.send("What are you doing!!!");
				} else {
					addJoinable(argsStringResult);
					message.channel.send(`${argsStringResult} is now joinable. Type **${message.content}** again to undo.`);
				}
			} else {
				message.channel.send(`${argsStringResult} is not a real role!`);
			}
		}	
	},
	'iam': (message, argsStringResult) => {
		if (!argsStringResult) return;
        else if (isJoinable(argsStringResult)) {
            var theRole = message.guild.roles.find("name", argsStringResult);
            if (hasRole(message.member, theRole.id)) {
                message.channel.send(`You already have this role!`);
            } else {
                message.member.addRole(theRole);
                message.channel.send(`Success! You now have the role **${argsStringResult}!**`);       
            }
 
        } else {
            message.channel.send(`${argsStringResult} is either not joinable or doesn't exist.`);
        }
	},
	'imnot': (message, argsStringResult) => {
		if (!argsStringResult) return;
        else if (isJoinable(argsStringResult)) {
            var theRole = message.guild.roles.find("name", argsStringResult);
            message.member.removeRole(theRole);
            message.channel.send(`Success! You no longer have the role **${argsStringResult}.**`);
 
        } else {
            message.channel.send(`${argsStringResult} is either not joinable or doesn't exist.`);
        }
	},
	'jrhelp': (message) => {
		message.channel.send(`Use these commands only in ${client.channels.get(roleRequestChannelID)}`);
		let tosend = ['```xl',
		prefix + 'ViewJRs : "View all the roles you can join."',
		prefix + 'JR : "Admin only: Add/remove a joinable role."',
		prefix + 'Iam : "Join a role."',
		prefix + 'ImNot : "Leave a role."',	'```'];
		message.channel.send(tosend.join('\n'));
	}
};
 
function hasRole(member, role) {
    return member.roles.find("id", role);
}
 
function isMention(arg) {
	if (arg == null) return false;
    var res = arg.replace(/</g, "").replace(/@/g, "").replace(/>/g, "").replace(/!/g, "");
    return client.guilds.get(guildID).members.find("id", res);
}
 
//rawName being Nickname if there is one, otherwise username
function mentiontorawName(arg) {
    var res = arg.replace(/</g, "").replace(/@/g, "").replace(/>/g, "").replace(/!/g, "");
	var theMember = client.guilds.get(guildID).members.find("id", res);

    if (theMember.nickname == null) {
        return theMember.user.username;
    } else {
        return theMember.nickname;
    }
}
 
function deleteTheMessages(message, number) {
        var msg;
        if (isNaN(number) || (number < 2)) { //if PHdelete with no valid argument
            msg = 2; //delete only PHdelete and the message than came immediately before
        } else { //else, delete args[1] messages
            msg = parseInt(number);
        }
        message.channel.fetchMessages({limit: msg}).then(messages => message.channel.bulkDelete(messages)).catch(console.error);
}

function isJoinable(rolename) {
    MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		console.log("querying for "+ rolename);
		var query = {name: rolename};
		db.collection("joinableroles").find(query).toArray(function(err, result) {
			if (err) throw err;
			console.log(result);
			if (result.length == 1) {
				return callback(null, true);
			} else {
				return callback(null, false);
			}
			db.close();
		});
	});
}
 
function addJoinable(rolename) {
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var myobj = {name: rolename};
		db.collection("joinableroles").insertOne(myobj, function(err, res) {
			if (err) throw err;
			console.log("1 record inserted: " + rolename);
			db.close();
		});
	}); 
}
 
function removeJoinable(rolename) {
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var myquery = {name: rolename};
		db.collection("customers").deleteOne(myquery, function(err, obj) {
			if (err) throw err;
			console.log("1 document deleted");
			db.close();
		});
	}); 
}
 
client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (!hasRole(oldMember, trustedID) && (hasRole(newMember, trustedID))) { //If we added the "Trusted" role to them
        if (hasRole(newMember, readyID)) {
            newMember.removeRole(readyID);
        }
        if (hasRole(newMember, SFWID)) {
            newMember.removeRole(SFWID);
        }
    } else

	if (!hasRole(oldMember, SFWID) && (hasRole(newMember, SFWID))) {
		if (hasRole(newMember, trustedID)) {
            newMember.removeRole(trustedID);
        }
	}
});
/*
client.on('roleDelete', (role) => {
    if (isjoinable(role.name)) {
        removeJoinable(role.name);
    }
});*/
 
//client.on('',''=>{});
 
//Guild events
 
client.on('guildMemberAdd', member => {
    client.channels.get(joinleaveChannelID).send(`+ + ${member.user} has joined ${member.guild.name}.`);
    client.channels.get(newcomerChannelID).send(`Hi ${member.user},\nWelcome to Positivity Hypno! Please start with these tips:
	1.  Read ${client.channels.get(welcomeAndRulesChannelID)}
	2. Check out our website: https://www.positivityhypno.com/about/
	3. Head to ${client.channels.get(worksafeGeneralChannelID)} and say hi!`);
});
 
client.on('guildMemberRemove', member => {
    client.channels.get(joinleaveChannelID).send(`- - ${member.user.username} has left ${member.guild.name}.`);
});
/*
client.on('guildBanAdd', (guild, user) => {
    client.channels.get(joinleaveChannelID).send(`${user.username} has been banned`);
});
 
client.on('guildBanRemove', (guild, user) => {
    client.channels.get(joinleaveChannelID).send(`${user.username} has been unbanned`);
});*/
 
//Channel events
 
//Message events (chat commands)
 
client.on('message', message => {
    if (message.author.bot) return; //to prevent a loop where the bot endlessley triggers itself to message
    if (message.channel.type === 'dm') { //to prevent DMs from doing shiieet to the bot
        console.log(message.author.username + ": " + message.content);
        return;
    }
    if ((raid) && (hasRole(message.member, newID)) && (!(message.channel.id == newcomerChannelID))) message.delete(); //deletes raider messages
   
    let args = message.content.split(' ').slice(1);
    var argsStringResult = args.join(' ');
	var m = message.content.toLowerCase();
 
    if ((m.includes(prefix + 'donebeingnew')) && (message.channel.id == newcomerChannelID)) {
        message.delete();
        if ((!hasRole(message.member, readyID)) && (!hasRole(message.member, trustedID)) && (!hasRole(message.member, SFWID))) {
            client.channels.get(joinleaveChannelID).send(`${message.member.user} has read the rules.`);
            message.member.addRole(readyID);
        }
    } else

    if (m.startsWith(prefix + 'setgame') && (hasRole(message.member, adminID))) {
        if (!argsStringResult) argsStringResult = 'hypnosis files';
        client.user.setGame(argsStringResult);
    } else
 
    if (m.startsWith(prefix + 'setstatus') && (hasRole(message.member, adminID))) {
        if (!argsStringResult) argsStringResult = 'online';
        client.user.setStatus(argsStringResult);
    } else

	if (m.startsWith(prefix + 'help')) {
		let tosend = ['```xl', prefix + 'MusicHelp : "View music commands."',
		prefix + 'JRhelp : "View joinable role commands."',
		prefix + 'RPhelp : "View rp commands."',	'```'];
		message.channel.send(tosend.join('\n'));
	} else

	if (((m.startsWith(prefix + 'join')) || (m.startsWith(prefix + 'add')) ||
		(m.startsWith(prefix + 'queue')) || (m.startsWith(prefix + 'hypnoqueue')) ||
		(m.startsWith(prefix + 'play')) || (m.startsWith(prefix + 'pause')) ||
		(m.startsWith(prefix + 'resume')) || (m.startsWith(prefix + 'skip')) ||
		(m.startsWith(prefix + 'time')) || (m.startsWith('volume'))) && 
		(!(message.channel.id == botChannelID))) {
		message.channel.send(`Keep music commands in ${client.channels.get(botChannelID)}.`);
		return;
	}

	if (((m.startsWith(prefix + 'viewjrs')) || (m.startsWith(prefix + 'iam')) ||
		(m.startsWith(prefix + 'imnot'))) && (!(message.channel.id == roleRequestChannelID))) {
		message.channel.send(`Keep role commands in ${client.channels.get(roleRequestChannelID)}.`);
		return;
	}

	if (musicCommands.hasOwnProperty(m.slice(prefix.length).split(' ')[0]) && (m.startsWith(prefix))) {
		message.channel.send("Not doing music commands for now.")//musicCommands[m.slice(prefix.length).split(' ')[0]](message)
	} else

	if (rpCommands.hasOwnProperty(m.slice(prefix.length).split(' ')[0]) && (m.startsWith(prefix))) {
		rpCommands[m.slice(prefix.length).split(' ')[0]](message, args)		
	} else

	if (joinableRoleCommands.hasOwnProperty(m.slice(prefix.length).split(' ')[0]) && (m.startsWith(prefix))) {
		message.channel.send("Not doing joinable role commands for now.");//joinableRoleCommands[m.slice(prefix.length).split(' ')[0]](message, argsStringResult)
	} else
    /*
 
    if (m.startsWith(prefix + 'lock') && (hasRole(message.member, modID))) {
        raid = !raid;
        if (raid) {
            client.guilds.get(guildID).defaultRole.setPermissions(0x00000000)
             .then(r => console.log(`Role updated ${r}`))
             .catch(console.error);
            client.channels.get(manualApprovalChannelID).send(`Raid mode on. All "New" members may only type in ${client.channels.get(welcomeAndRulesChannelID)}`);
        } else { //['READ_MESSAGES'] 0x00000400
            client.guilds.get(guildID).defaultRole.setPermissions(['READ_MESSAGES'])
             .then(r => console.log(`Role updated ${r}`))
             .catch(console.error);
            client.channels.get(manualApprovalChannelID).send(`Raid mode off.`);
        }
    } else */
	/*
 	if (m.startsWith(prefix + 'yee')) {
		const voiceChannel = message.member.voiceChannel;
		if (!voiceChannel) return message.reply("Please be in a voice channel first!");
		if (client.guilds.get(guildID).voiceConnection) return;
		voiceChannel.join()
			.then(connnection => {
				const stream = yt("https://youtu.be/q6EoRBvdVPQ", { filter: 'audioonly' });
				const dispatcher = connnection.playStream(stream);
			dispatcher.on('end', () => voiceChannel.leave());
		});
	} else */

    if (m.startsWith(prefix + 'delete') && (hasRole(message.member, adminID))) {
        deleteTheMessages(message, args[0]);
    } 

});
 
client.login(process.env.BOT_TOKEN);
 
//https://discord.js.org/#/docs/main/stable/general/welcome
//https://anidiotsguide.gitbooks.io/discord-js-bot-guide/video-guides/episode-01.html
//https://docs.mongodb.com/getting-started/node/introduction/
//https://discordapp.com/oauth2/authorize?client_id=326740767886278660&scope=bot&permissions=0
 
