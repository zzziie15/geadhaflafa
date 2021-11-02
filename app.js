const Discord = require("discord.js")
require("dotenv").config()
const { Client, Intents, MessageEmbed } = require("discord.js")
const client = new Client({
    intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS],
    ws: { properties: { $browser: "Discord iOS" } }
})
const { readdirSync } = require("fs")
const humanizeDuration = require("humanize-duration")
const Timeout = new Set()
client.slash = new Discord.Collection()
const { REST } = require("@discordjs/rest")
const { Routes } = require("discord-api-types/v9")
const path = require("path")
const { keepalive } = require("./keepalive")
const commands = []
readdirSync("./commands/").map(async dir => {
    readdirSync(`./commands/${dir}/`).map(async (cmd) => {
        commands.push(require(path.join(__dirname, `./commands/${dir}/${cmd}`)))
    })
})
const rest = new REST({ version: "9" }).setToken(process.env.token);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.botID),
            { body: commands }
        )
        console.log("\x1b[34m%s\x1b[0m", "Successfully reloaded application (/) commands.")
    } catch (error) {
        console.error(error)
    }
})();

["slash", "anticrash"].forEach(handler => {
    require(`./handlers/${handler}`)(client)
})
client.on("ready", () => {
    console.log("\x1b[34m%s\x1b[0m", `Logged in as ${client.user.tag}!`)
    const statuses = [ // status bot
        "Hentaiz",
        `with ${client.guilds.cache.size} servers`
    ]
    let index = 0
    setInterval(() => {
        if (index === statuses.length) index = 0
        const status = statuses[index]
        client.user.setActivity(`${status}`, {
            type: "LISTENING",
            browser: "DISCORD IOS"
        })
        index++
    }, 60000)
})
client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand() || interaction.isContextMenu()) {
        if (!client.slash.has(interaction.commandName)) return
        if (!interaction.guild) return
        const command = client.slash.get(interaction.commandName)
        try {
            if (command.timeout) {
                if (Timeout.has(`${interaction.user.id}${command.name}`)) {
                    return interaction.reply({ content: `명령어를 다시 사용하려면 **${humanizeDuration(command.timeout, { round: true })}** 기다려야 합니다.`, ephemeral: true })
                }
            }
            if (command.permissions) {
                if (!interaction.member.permissions.has(command.permissions)) {
                    return interaction.reply({ content: `:x: 이 명령어을 사용하려면 \`${command.permissions}\` 이(가) 필요합니다.`, ephemeral: true })
                }
            }
            command.run(interaction, client)
            Timeout.add(`${interaction.user.id}${command.name}`)
            setTimeout(() => {
                Timeout.delete(`${interaction.user.id}${command.name}`)
            }, command.timeout)
        } catch (error) {
            console.error(error)
            await interaction.reply({ content: ":x: 명령어를 실행하는데 오류가 걸렸습니다...", ephemeral: true })
        }
    }
})
client.on("guildCreate", guild => {
    const embed = new MessageEmbed()
        .setTitle("새 서버가 추가되었습니다!!")
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(` ${guild.name} 이 서버에 추가되었습니다! ${guild.memberCount}\n토탈 서버: ${client.guilds.cache.size}\n토탈 유저: ${client.users.cache.size}`)
        .setTimestamp()
    const logchannel = client.channels.cache.get(process.env.Channel_log)
    logchannel.send({ embeds: [embed] })
})
client.on("guildDelete", guild => {
    const embed = new MessageEmbed()
        .setTitle("서버에서 나가졌어!")
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(` ${guild.name} 이 서버에서 나가짐 ${guild.memberCount}\n토탈 서버: ${client.guilds.cache.size}\n토탈 유저: ${client.users.cache.size}`)
        .setTimestamp()
    const logchannel = client.channels.cache.get(process.env.Channel_log)
    logchannel.send({ embeds: [embed] })
})
// Distube
const Distube = require("distube")
const { SoundCloudPlugin } = require("@distube/soundcloud")
const { SpotifyPlugin } = require("@distube/spotify")
/* eslint new-cap: ["error", { "properties": false }] */
client.distube = new Distube.default(client, {
    leaveOnEmpty: true,
    emptyCooldown: 30,
    leaveOnFinish: true,
    emitNewSongOnly: true,
    updateYouTubeDL: true,
    nsfw: true,
    youtubeCookie: process.env.ytcookie,
    plugins: [new SoundCloudPlugin(), new SpotifyPlugin()]
})
const status = (queue) => `불륨: \`${queue.volume}%\` | 계속 재생: \`${queue.repeatMode ? queue.repeatMode === 2 ? "모든 대기 리스트" : "이 노래" : "Off"}\` | 자동 재생: \`${queue.autoplay ? "On" : "Off"}\` | 필터: \`${queue.filters.join(", ") || "Off"}\``
// DisTube event listeners
client.distube
    .on("playSong", (queue, song) => {
        const embed = new MessageEmbed()
            .setTitle("<:headphones:879518595602841630> 재생 시작")
            .setDescription(`[${song.name}](${song.url})`)
            .addField("**본 사람:**", song.views.toString())
            .addField("<:like:879371469132562552>", song.likes.toString())
            .addField("<:dislike:879371468817973299>", song.dislikes.toString())
            .addField("**Duration:**", song.formattedDuration.toString())
            .addField("**Status**", status(queue).toString())
            .setThumbnail(song.thumbnail)
            .setColor("RANDOM")
        queue.textChannel.send({ embeds: [embed] })
    })
    .on("addSong", (queue, song) => {
        const embed = new MessageEmbed()
            .setTitle("<:addsong:879518595665780746> 이 노래를 대기 리스트에 추가")
            .setDescription(`\`${song.name}\` - \`${song.formattedDuration}\` - 요청자: ${song.user}`)
            .setColor("RANDOM")
        queue.textChannel.send({ embeds: [embed] })
    })
    .on("addList", (queue, playlist) => {
        const embed = new MessageEmbed()
            .setTitle("<:addsong:879518595665780746> Add list")
            .setDescription(`추가 \`${playlist.name}\` 플레이 리스트 (${playlist.songs.length} 노래들) 대기 리스트\n${status(queue)}`)
            .setColor("RANDOM")
        queue.textChannel.send({ embeds: [embed] })
    })
    .on("error", (textChannel, e) => {
        console.error(e)
        textChannel.send(`오류가 발생했어요: ${e}`)
    })
    .on("finish", queue => queue.textChannel.send("***더 이상 대기 리스트에 노래가 없습니다, 채널을 떠납니다.***"))
    .on("disconnect", queue => queue.textChannel.send("***연결이 안 됩니다***"))
    .on("empty", queue => queue.textChannel.send("***채널이 비어있어 채널을 떠납니다.***"))
    .on("initQueue", (queue) => {
        queue.autoplay = false
        queue.volume = 50
    })
keepalive()
client.login(process.env.token)
