const Discord = require("discord.js");
const client = new Discord.Client();
const randomInt = require('random-int');
//var MongoClient = require('mongodb').MongoClient;
//var assert = require('assert');
 
var guildID = process.env.ID_GUILD;
 
var newID = process.env.ID_ROLE_NEW;
var readyID = process.env.ID_ROLE_READY;
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
 
var raid = false;
var switched = false;
 
client.on('ready', () => {
    console.log(readylog);
    client.user.setGame("hypnosis files");
})
 
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
    var isNickname = arg.startsWith("<@!");
 
    var res = arg.replace(/</g, "").replace(/@/g, "").replace(/>/g, "").replace(/!/g, "");
    if (isNickname) {
        return client.guilds.get(guildID).members.find("id", res).nickname;
    } else {
        return client.guilds.get(guildID).members.find("id", res).user.username;
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
        console.log(`${newMember.user.username} has updated.`);
    }
});
 
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
 
var prefix = "ph";
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
    } else
 
    if (message.content.startsWith(prefix + 'joinablerole') && (hasRole(message.member, adminID))) {
        if (!argsStringResult) return;
        if (settings.joinableRoles.contains(args[0])) {
 
        }
    } else
 
    if (message.content.startsWith(prefix + 'joinrole') && (isJoinable(argsStringResult[1]))) {
        if (!argsStringResult) return;
    } else
 
    if (message.content.startsWith(prefix + 'leaverole') && (isJoinable(argsStringResult[1]))) {
        if (!argsStringResult) return;
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
 