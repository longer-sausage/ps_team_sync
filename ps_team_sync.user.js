// ==UserScript==
// @name         ps队伍同步
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  手动同步队伍
// @author       longer_sausage
// @match        *://play.pokemonshowdown.com/*
// @icon         https://www.longersausage.com:8443/image/icon.ico
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/longer-sausage/ps_team_sync/main/ps_team_sync.user.js
// @updateURL    https://raw.githubusercontent.com/longer-sausage/ps_team_sync/main/ps_team_sync.user.js
// ==/UserScript==

const URL = "https://www.longersausage.com:8443/api/ps_teams";
const TOKEN_COOKIE_NAME = "ps_sync_token";

var nickname = "";

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    // 使用 SameSite=Strict and Secure 以提高安全性
    // NOTE: Secure 属性仅在 HTTPS 下有效
    document.cookie = name + "=" + (encodeURIComponent(value) || "") + expires + "; path=/; SameSite=Strict; Secure";
}

function deleteCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999; path=/; SameSite=Strict; Secure';
}

function getCookie(name) {
    const cookieArr = document.cookie.split("; ");
    for (var i = 0; i < cookieArr.length; i++) {
        const cookiePair = cookieArr[i].split("=");
        if (name === cookiePair[0]) {
            return decodeURIComponent(cookiePair[1]);
        }
    }
    return null;
}

function ensureToken() {
    let token = getCookie(TOKEN_COOKIE_NAME);
    if (!token) {
        token = prompt("请输入token:");
        if (token) {
            setCookie(TOKEN_COOKIE_NAME, token, 3650);
        } else {
            alert("token无效");
            return null;
        }
    }
    return token;
}

function downloadTeam() {
    const token = ensureToken();
    if (!token) return;

    var localTeam = localStorage.getItem("showdown_teams");
    fetch(URL + "?nickname=" + nickname, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
        .then(response => {
            if (response.status === 401) {
                deleteCookie(TOKEN_COOKIE_NAME);
                throw 'token无效';
            }
            if (!response.ok) throw '网络错误: ' + response.json().status;
            return response.json();
        })
        .then(data => {
            var serverTeamArray = data.team.split("\n");
            var resultTeamArray;
            if (localTeam) {
                resultTeamArray = [...new Set([...localTeam.split("\n"), ...serverTeamArray])];
            } else {
                resultTeamArray = serverTeamArray;
            }
            var resultTeam = resultTeamArray.join("\n");
            localStorage.setItem("showdown_teams", resultTeam);
            alert("下载并合并成功，请刷新！");
        })
        .catch(error => {
            alert('错误: ' + error);
        });
}

function uploadTeam() {
    const token = ensureToken();
    if (!token) return;

    var localTeam = localStorage.getItem("showdown_teams");
    fetch(URL + "?nickname=" + nickname, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            'team': localTeam
        })
    })
        .then(response => {
            if (response.status === 401) {
                deleteCookie(TOKEN_COOKIE_NAME);
                throw 'token无效';
            }
            if (!response.ok) throw '网络错误: ' + response.json().status;
            alert("上传成功！");
        })
        .catch(error => {
            alert('错误: ' + error);
        });
}

(function () {
    'use strict';

    nickname = getCookie("showdown_username");

    if (nickname == null) return;

    ensureToken();

    var downloadButton = document.createElement("button");
    var uploadButton = document.createElement("button");
    downloadButton.innerText = "合并下载";
    downloadButton.className = "button";
    downloadButton.onclick = downloadTeam;
    uploadButton.innerText = "覆盖上传";
    uploadButton.className = "button";
    uploadButton.onclick = uploadTeam;

    var target = document.getElementsByClassName("teampane");

    const timer = setInterval(function () {
        var detect = document.getElementsByClassName("username");
        if (detect.length) {
            target[0].append(uploadButton);
            target[0].append(downloadButton);
            clearInterval(timer);
        }
    }, 1000);
})();