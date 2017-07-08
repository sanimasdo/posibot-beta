const Discord = require("discord.js");
const client = new Discord.Client();
const randomInt = require('random-int');
const yt = require('ytdl-core');
//var MongoClient = require('mongodb').MongoClient;
//var assert = require('assert');
 
var guildID = process.env.ID_GUILD;
 
var newID = process.env.ID_ROLE_NEW;
var readyID = process.env.ID_ROLE_READY;
var SFWID = process.env.ID_ROLE_SFW;
var trustedID = process.env.ID_ROLE_TRUSTED;
var modID = process.env.ID_ROLE_MOD;
var adminID = process.env.ID_ROLE_ADMIN;
 
var newcomerChannelID = process.env.ID_CHANNEL_NEWCOMERS;
var joinleaveChannelID = process.env.ID_CHANNEL_JOINLEAVE;
var manualApprovalChannelID = process.env.ID_CHANNEL_MANUALAPPROVAL;
var welcomeAndRulesChannelID = process.env.ID_CHANNEL_WELCOMEANDRULES;
var worksafeGeneralChannelID = process.env.ID_CHANNEL_WORKSAFEGENERAL;
var nsfwGeneralChannelID = process.env.ID_CHANNEL_NSFWGENERAL;

var readylog = process.env.READY_LOG;
var prefix = process.env.PREFIX;
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

const commands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.send(`Add some songs to the queue first with ${prefix}add`);
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
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
				} else if (m.content.startsWith('volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.send(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith('volume-')){
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
	'help': (msg) => {
		let tosend = ['```xl', prefix + 'join : "Join Voice channel of msg sender"',
		prefix + 'add : "Add a valid youtube link to the queue"',
		prefix + 'queue : "Shows the current queue, up to 15 songs shown."',
		prefix + 'play : "Play the music queue if already joined to a voice channel"',
		'', 'the following commands only function while the play command is running:'.toUpperCase(),
		prefix + 'pause : "pauses the music"',	prefix + 'resume : "resumes the music"',
		prefix + 'skip : "skips the playing song"',
		prefix + 'time : "Shows the playtime of the song."',
		'volume+(+++) : "increases volume by 2%/+"',
		'volume-(---) : "decreases volume by 2%/-"',	'```'];
		msg.channel.send(tosend.join('\n'));
	},
	'reboot': (msg) => {
		if (msg.author.id == adminID) process.exit(); //Requires a node module like Forever to work.
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
 
function isJoinable(role) {
    return false; //TODO
}
/*
MongoClient.connect(settings.url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");
  db.close();
});*/
 
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
	if mongodatabase.joinableRoles.contains(role) {
		mongodatabase.joinableRoles.remove(argsStringResult);
	}
});*/
 
//client.on('',''=>{});
 
//Guild events
 
client.on('guildMemberAdd', member => {
    let guild = member.guild;
    client.channels.get(joinleaveChannelID).send(`++${member.user.username} has joined the server`);
    client.channels.get(newcomerChannelID).send(`Hi ${member.user},\nWelcome to Positivity Hypno! Please start with these tips:\n1. read ${client.channels.get(welcomeAndRulesChannelID)}\n2. check out our google doc\n3. head to ${client.channels.get(worksafeGeneralChannelID)} or ${client.channels.get(nsfwGeneralChannelID)} and say hi!`);
});
 
client.on('guildMemberRemove', member => {
    client.channels.get(joinleaveChannelID).send(`--${member.user.username} has left the server`);
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
 
    if ((message.content.toLowerCase().startsWith(prefix + 'donebeingnew')) && (message.channel.id == newcomerChannelID)) {
        message.delete();
        if (!hasRole(message.member, readyID)) {
            client.channels.get(manualApprovalChannelID).send(`${message.member.user} has read the rules.`);
            message.member.addRole(readyID);
        }
    } else
 
    if (message.content.toLowerCase().startsWith(prefix + 'setgame') && (hasRole(message.member, adminID))) {
        if (!argsStringResult) argsStringResult = 'hypnosis files';
        client.user.setGame(argsStringResult);
    } else
 
    if (message.content.toLowerCase().startsWith(prefix + 'setstatus') && (hasRole(message.member, adminID))) {
        if (!argsStringResult) argsStringResult = 'online';
        client.user.setStatus(argsStringResult);
    } else
 
    if (message.content.toLowerCase().startsWith(prefix + 'boop') && (isMention(args[0]))) {
        message.channel.send(`*boops ${mentiontorawName(args[0])}*`);
    } else
 
    if (message.content.toLowerCase().startsWith(prefix + 'slap') && (isMention(args[0]))) {
        message.channel.send(`*slaps ${mentiontorawName(args[0])}*`);
    } else
 
    if (message.content.toLowerCase().startsWith(prefix + 'bap') && (isMention(args[0]))) {
        message.channel.send(`*baps ${mentiontorawName(args[0])}*`);
    } else

	if (message.content.toLowerCase().startsWith(prefix + 'doot')) {
		if (isMention(args[0])) {
			message.channel.send(`*doots her trumpet at ${mentiontorawName(args[0])}!*`);
		} else {
			message.channel.send(`*doots her trumpet!* ^^`);
		}
    } else
 
    if (message.content.toLowerCase().startsWith(prefix + 'rape') && (isMention(args[0]))) {
        var randomRape = [`*takes ${mentiontorawName(args[0])} to a fancy restaurant*`,
                        `*comforts ${mentiontorawName(args[0])} and takes them to see a therapist*`];
        var pick = randomInt(randomRape.length - 1);
        message.channel.send(randomRape[pick]);
    } else

    if (message.content.toLowerCase().startsWith(prefix + '8ball')) {
        var random8ball = [`It is certain.`, `It is decidedly so.`, `Without a doubt.`, `Yes definitely.`, `You may rely on it.`,
			`As I see it, yes.`, `Most likely.`, `Outlook good.`, `Yes.`, `Signs point to yes.`, `Reply hazy try again.`,
			`Better not tell you now.`, `Cannot predict now.`, `Concentrate and ask again.`, `Don't count on it.`, `My reply is no.`,
			`My sources say no.`, `Outlook not so good.`, `Very doubtful.`];
        var pick = randomInt(random8ball.length - 1);
        message.channel.send(random8ball[pick]);
    } else

	if (message.content.toLowerCase().startsWith(prefix + 'hypnoqueue')) {
		queue[guildID].songs = [];
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=JO98V-w4ghM', title: '2017-05-14 Transformation Session 1', requester: 'PosiBot'});
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=tsiEoiwYZQQ', title: '2017-05-17 Transformation Session 2', requester: 'PosiBot'});
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=CULTVCodw1k', title: '2017-05-23 Lucid dreaming session 1', requester: 'PosiBot'});
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=2NEKTBawiVs', title: '2017-05-30 Anxiety reduction session 1', requester: 'PosiBot'});
		queue[guildID].songs.push({url: 'https://www.youtube.com/watch?v=U69aeFgcpWg', title: '2017-05-31 Imposition session 1', requester: 'PosiBot'});
	} else

	if (commands.hasOwnProperty(message.content.toLowerCase().slice(prefix.length).split(' ')[0])) {
		commands[message.content.toLowerCase().slice(prefix.length).split(' ')[0]](message)
	} else
    /*
 
    if (message.content.toLowerCase().startsWith(prefix + 'lock') && (hasRole(message.member, modID))) {
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

    if (message.content.startsWith(prefix + 'joinablerole') && (hasRole(message.member, adminID))) {
        if (!argsStringResult) return;
        if (mongodatabase.joinableRoles.contains(argsStringResult)) {
			mongodatabase.joinableRoles.remove(argsStringResult);
			message.channel.send(`${argsStringResult} has gone from joinable to no longer joinable.`);
        } else if (argsStringResult is a real role) {
			mongodatabase.joinableRoles.add(argsStringResult);
			message.channel.send(`${argsStringResult} is now joinable. Type ${message.content} again to undo.`);
		}
    } else
 
    if (message.content.startsWith(prefix + 'joinrole') && (isJoinable(argsStringResult))) {
        if (!argsStringResult) return;
		if (mongodatabase.joinableRoles.contains(argsStringResult)) {
			message.member.addRole(argsStringResult);
			message.channel.send(`Success! You now have the role ${argsStringResult}.`);
		} else {
			message.channel.send(`${argsStringResult} is not joinable.`);
		}
    } else
 
    if (message.content.startsWith(prefix + 'leaverole') && (isJoinable(argsStringResult))) {
        if (!argsStringResult) return;
		if (mongodatabase.joinableRoles.contains(argsStringResult)) {
			message.member.removeRole(argsStringResult);
			message.channel.send(`Success! You no longer have the role ${argsStringResult}.`);
		} else {
			message.channel.send(`${argsStringResult} is not joinable.`);
		}
    } else */
 
    if (message.content.startsWith(prefix + 'delete') && (hasRole(message.member, adminID))) {
        deleteTheMessages(message, args[0]);
    }
});
 
client.login(process.env.BOT_TOKEN);
 
//https://discord.js.org/#/docs/main/stable/general/welcome
//https://anidiotsguide.gitbooks.io/discord-js-bot-guide/video-guides/episode-01.html
//https://docs.mongodb.com/getting-started/node/introduction/
//https://discordapp.com/oauth2/authorize?client_id=326740767886278660&scope=bot&permissions=0
 