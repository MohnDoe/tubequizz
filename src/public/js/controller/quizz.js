angular.module('App')
    .controller('QuizzCtrl', function($rootScope, $state, Api) {

        var scope = this;
        scope.loading = true;

        scope.clipOptions = {};

        scope.clips = [{
            title: "MUT MUT ÉCARTEZ-VOUS (Euro Truck Simulator 2)",
            video_id: 'ADUJ87Wxyp4',
            thumbnail: 'https://i.ytimg.com/vi/ADUJ87Wxyp4/mqdefault.jpg',
            start_time: 181285,
            duration: 19172
        }, {
            title: "ET MAINTENANT, FERME TA GUEULE (DayZ)",
            video_id: '80jDpdh4wBc',
            thumbnail: 'https://i.ytimg.com/vi/80jDpdh4wBc/mqdefault.jpg',
            start_time: 466145,
            duration: 18681
        }, {
            title: "J'APPRENDRE LA SURVIE ET LA CONJUGAISON (H1Z1 Battle Royale)",
            video_id: '--6EQeJqf8E',
            thumbnail: 'https://i.ytimg.com/vi/--6EQeJqf8E/mqdefault.jpg',
            start_time: 450593,
            duration: 23160
        }, {
            title: "J'APPRENDRE LA SURVIE ET LA CONJUGAISON (H1Z1 Battle Royale)",
            video_id: '--6EQeJqf8E',
            thumbnail: 'https://i.ytimg.com/vi/--6EQeJqf8E/mqdefault.jpg',
            start_time: 435170,
            duration: 14830
        }, {
            title: "ET J'AI CRAMÉ (Half-Life 2 en COOP)",
            video_id: 'i-ELRMO3vHQ',
            thumbnail: 'https://i.ytimg.com/vi/i-ELRMO3vHQ/mqdefault.jpg',
            start_time: 701483,
            duration: 5000
        }];

        scope.actualPosition = 0;

        scope.videos = [];

        scope.answers = [];

        scope.initClip = function(position) {
            clip = scope.clips[position];
            scope.clipOptions = clip;
            scope.actualPosition = position;
            $rootScope.$emit('clipChanged', clip);
            scope.getAnswers();
        }



        scope.nextClip = function() {
            actualPosition = scope.actualPosition;
            if (actualPosition + 1 < 5) {
                scope.initClip(actualPosition + 1);
            }
        }

        scope.getVideos = function() {
            Api.call({
                url: 'https://www.googleapis.com/youtube/v3/search?key=AIzaSyBMDrVhmiR2Av3cBfm2_RM7XVvD6udLwuo&channelId=UCYGjxo5ifuhnmvhPvCc3DJQ&part=snippet&order=date&maxResults=50&type=video',
                method: 'GET',
                callback: function(res) {
                    scope.videos = res.items;
                    scope.getAnswers();
                }
            })
        }

        scope.deleteAnswers = function() {
            scope.answers = [];
        }

        scope.randomizeVideos = function() {
            scope.videos = scope.shuffle(scope.videos);
        }

        scope.shuffle = function(a) {
            var j, x, i;
            for (i = a.length; i; i--) {
                j = Math.floor(Math.random() * i);
                x = a[i - 1];
                a[i - 1] = a[j];
                a[j] = x;
            }
            return a;
        }

        scope.getAnswers = function() {
            scope.randomizeVideos();
            for (var i = 0; i < 3; i++) {
                scope.answers[i] = scope.videos[i];
            }
            scope.answers[3] = {
                id: scope.clips[scope.actualPosition].video_id,
                snippet: {
                    title: scope.clips[scope.actualPosition].title,
                    thumbnails: {
                        medium: {
                            url: scope.clips[scope.actualPosition].thumbnail
                        }
                    }
                }
            }
            scope.answers = scope.shuffle(scope.answers);
            console.log(scope.answers);
        }


        scope.initClip(0);
        scope.getVideos();

    });