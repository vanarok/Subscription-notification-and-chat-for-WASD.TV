alertQueue = 0
userId = []

var channelNick = setting['channelNick']
var durationAlert = setting['durationAlert']
var DelayMsgOnScr = setting['DelayedMessageOnScreen']
var volumeMusic = setting['VolumeMusic']
var voice = setting['Voice']
var key = setting['Key']

var getChatToken = httpGet('https://wasd.tv/api/auth/chat-token', 'POST')
var getChannelJson = httpGet('https://wasd.tv/api/channels/nicknames/' + channelNick, 'GET')
var jwt = JSON.parse(getChatToken).result
var channelId = JSON.parse(getChannelJson).result.channel_id
var getStreamJson = httpGet('https://wasd.tv/api/media-containers?media_container_status=RUNNING&channel_id=' + channelId, 'GET')
var streamId = JSON.parse(getStreamJson).result[0].media_container_streams[0].stream_id
var isExists = false

function httpGet(theUrl, method) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open(method, theUrl, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

function alertNewFollower(data) {
    $('#alertMessage').append($('<img src="giphy.gif" />')).hide().show(1000);
    $('#alertMessage').append($('<div>').text(data.payload.user_login + ' ' + data.message)).hide().show(1000);
    if (voice == true) {
        setTimeout(() => {
            VoiceRSS.speech({
                key: key,
                src: data.payload.user_login + ' ' + data.message,
                hl: 'ru-RU',
                v: 'Peter',
                r: 0,
                c: 'mp3',
                f: '48khz_16bit_stereo',
                ssml: false
            });
        }, 1000)
    }
    $('audio#sound')[0].volume = volumeMusic;
    setTimeout(() => {
        $('audio#sound')[0].play()
    }, 4000)
    setTimeout(() => {
        $('#alertMessage').first().hide('slow', function () {
            $(this).empty();
        });
        $('audio#sound')[0].pause()
        $('audio#sound')[0].currentTime = 0
        alertQueue -= 1
    }, durationAlert);
}

$(document).ready(function () {
    var socket = io.connect('wss://chat.wasd.tv/', {
        transports: ['websocket']
    });
    socket.on('connect', () => {
        $("#messages").empty(); //удаление "загрузка"
        socket.emit('join', {
            "streamId": streamId,
            "channelId": channelId,
            "jwt": jwt,
            "excludeStickers": true
        });
    });
    socket.on('disconnect', () => {});
    socket.on('message', (data) => {
        $('#messages').append($('<div>').text(data.user_login + ': ' + data.message)) //загрузка сообщений на страницу
        $('#messages div').last().css("display", "none").show('slow');
        setTimeout(() => {
            $('#messages div').first().hide('slow', function () {
                $(this).remove();
            });
        }, DelayMsgOnScr)
        $("#messages").animate({
            scrollTop: ($("#messages").prop('scrollHeight'))
        }, 500);
    });

    socket.on('event', (data) => {
        if (data.event_type == 'NEW_FOLLOWER') {
            isExists = false
            for (let i = 0; i < userId.length; i++) {
                if (userId[i] == data.payload.user_id) {
                    isExists = true
                    break
                }
            }
            if (isExists == false) {
                data.payload.user_id
                userId.push(data.payload.user_id);
                setTimeout(alertNewFollower, durationAlert * alertQueue + 1000, data)
                alertQueue += 1
            }
        }
    });
});