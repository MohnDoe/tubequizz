angular.module('App', ['templates', 'ui.router', 'ngAnimate', 'ngRoute', 'angularMoment'])

.constant('Config', {
    apiBase: window.location.protocol + "//" + window.location.host + "/api/"
})

.config(function($stateProvider, $urlRouterProvider, $sceProvider, $locationProvider) {

    $sceProvider.enabled(false);
    $locationProvider.html5Mode(true);

    $stateProvider
        .state('quizz', {
            url: '/',
            templateUrl: 'quizz/index.html',
            controller: 'QuizzCtrl as Quizz'
        }).state('404', {
            url: '/404',
            templateUrl: 'errors/404.html'
        });

    $urlRouterProvider.otherwise(function($injector) {
        var $state;
        $state = $injector.get('$state');
        return $state.go('404', null, {
            location: false
        });
    });

})

.run(function($rootScope, $state, $timeout) {

    $rootScope.$state = $state;
    $rootScope.Math = Math;

    $rootScope.safeApply = function safeApply(operation) {
        var phase = this.$root.$$phase;
        if (phase !== '$apply' && phase !== '$digest') {
            this.$apply(operation);
            return;
        }

        if (operation && typeof operation === 'function') {
            operation();
        }
    };

})


//Probably should move this if we get more util shite
.filter('time', function() {
    return function(ms, precise) {

        var totalSeconds = ms / 1000;

        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor(totalSeconds % 3600 / 60);
        var seconds = Math.floor(totalSeconds % 60);
        var milliseconds = Math.floor(ms % 1000);

        var ret;
        ret = hours ? hours + ":" : "";
        ret += (minutes || hours) || !precise ? (minutes < 10 ? '0' + minutes : minutes) + ":" : "";
        ret += seconds < 10 && !precise ? '0' + seconds : seconds;
        ret += precise ? '.' + (milliseconds < 10 ? '00' + milliseconds : (milliseconds < 100 ? '0' + milliseconds : milliseconds)) : "";

        return ret;
    };
});
angular.module('App')
    .controller('QuizzCtrl', function($rootScope, $state, Api, $timeout) {

        var scope = this;
        scope.loading = true;
        scope.timer = 0; // in MS

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

        scope.answersLoaded = false;

        scope.percentTimerLeft = 100;
        scope.potentialPoints = 300;

        scope.userScore = 0;

        scope.popupVisible = false;

        scope.popupOptions = {
            quizz: {
                channel: 'wankil',
                gifs: {
                    correct: 8,
                    wrong: 4
                }
            }
        }

        scope.popupInfos = {
            answer: {
                points: 10,
                is_correct: true,
                next: true
            },
            end_game: {

            },
            type: 'answer'
        }


        scope.initClip = function(position) {
            clip = scope.clips[position];
            scope.clipOptions = clip;
            scope.actualPosition = position;
            $rootScope.$emit('clipChanged', clip);
            scope.isTimeUp = false;
            if (position != 0) {
                scope.getAnswers();
            }

            scope.resetTimer();
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
            scope.answersLoaded = false;
            scope.randomizeVideos();
            for (var i = 0; i < 3; i++) {
                scope.answers[i] = scope.videos[i];
            }
            scope.answers[3] = {
                id: {
                    videoId: scope.clips[scope.actualPosition].video_id
                },
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
            scope.answersLoaded = true;
            // console.log(scope.answers);
        }

        scope.answer = function(a) {
            scope.stopTimer();

            current_clip_id = scope.clips[scope.actualPosition].video_id;
            if (current_clip_id == a) {
                is_correct = true;
            } else {
                is_correct = false;
            }
            scope.updateUserScore(is_correct);
            $rootScope.$emit('answerGiven', {
                is_correct: is_correct,
                points: scope.userScore,
                next: true
            });
            // scope.nextClip();
        }

        scope.startTimer = function() {
            scope.timer = 0;
            scope.timerTimeout = $timeout(scope.onTimeout, 100);
        }

        scope.resetTimer = function() {
            scope.stopTimer();
            scope.timer = 0;
        }

        scope.onTimeout = function() {
            // TODO : get rid of this
            if (scope.timer >= scope.getChoiceDuraton()) {
                scope.timeIsUp();
                return;
            }
            scope.timer++;
            scope.updateUI();
            scope.timerTimeout = $timeout(scope.onTimeout, 100);
        }

        scope.updatePercentTimerLeft = function() {
            //TODO : make it less frequent
            scope.percentTimerLeft = (scope.getChoiceDuraton() - (scope.timer)) / scope.getChoiceDuraton() * 100;
            // console.log(scope.percentTimerLeft);
        }


        scope.updateUI = function() {
            scope.updatePercentTimerLeft();
            scope.updatePotentialPoints();
        }

        scope.calculatePotentialPoints = function() {
            //TODO : calculate accordingly to the level
            var pointsForThisClip = 300; // TODO : get points for a clip !
            potentialPoints = Math.round(pointsForThisClip - scope.timer * (pointsForThisClip / scope.getChoiceDuraton()));
            return potentialPoints;

        }

        scope.getScore = function() {
            var potentialPoints = scope.calculatePotentialPoints();
            return {
                potentialPoints: potentialPoints,
                wrongPoints: scope.isTimeUp ? -(300 / 2) : Math.round(-Math.abs(potentialPoints) / 1.5)
            }
        }

        scope.getChoiceDuraton = function() {
            var numberOfLevels = 10; //TODO : get number of levels
            var minChoiceDuration = 10 * 10; //10 sec
            var maxChoiceDuration = 30 * 10; // 30 sec
            var currentLevel = 10; // TODO : get current level

            b = (minChoiceDuration - maxChoiceDuration) / (numberOfLevels - 1);
            c = b * (currentLevel - 1) + maxChoiceDuration;
            // console.log(c);
            return c;
        }

        scope.stopTimer = function() {
            $timeout.cancel(scope.timerTimeout);
        }

        scope.timeIsUp = function() {
            scope.isTimeUp = true;
            scope.stopTimer();
            scope.updateUserScore(false);
        }

        scope.updateUserScore = function(is_correct) {
            // console.log("updateUserScore");
            score = scope.getScore();
            // console.log(score);
            if (is_correct) {
                scope.userScore += score.potentialPoints;
            } else {
                scope.userScore += score.wrongPoints;
            }
        }

        scope.updatePotentialPoints = function() {
            scope.potentialPoints = scope.calculatePotentialPoints();
        }

        $rootScope.$on('nextClip', function(e) {
            console.log('e:nextClip');
            scope.nextClip();
        });

        $rootScope.$on('clipStarted', function(e) {
            console.log("e:clipStarted");
            scope.startTimer();
        });


        scope.initClip(0);
        scope.getVideos();


    });
angular.module('App')
    .directive('player', function(Api, $timeout, $interval) {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'directives/player.html',
            scope: {
                //snip:    "=snip",
                clip: "=clip"
            },
            controllerAs: 'Player',
            bindToController: true,
            controller: function($scope, $element, $rootScope) {
                var scope = this;

                var player, restartTimer, loopStarted, initInterval;

                function loop() {
                    console.log('loop started : st = ' + scope.clip.start_time + ' | duration = ' + scope.clip.duration);
                    player.seekTo(scope.clip.start_time / 1000, true);
                    // player.playVideo();
                    $timeout.cancel(restartTimer);
                    restartTimer = $timeout(loop, scope.clip.duration);
                }

                function initYoutube() {
                    // console.log('initYoutube');
                    loopStarted = false;
                    player = new YT.Player('ytplayer', {
                        height: '400',
                        width: '100%',
                        playerVars: {
                            controls: 0,
                            //autohide:       0,
                            autoplay: 1,
                            disablekb: 1,
                            enablejsapi: 1,
                            fs: 0,
                            modestbranding: 1, //only works with controls enabled
                            playsinline: 1,
                            showinfo: 0,
                            rel: 0,
                            theme: 'dark',
                        },
                        videoId: scope.clip.video_id,
                        events: {
                            'onReady': function() {
                                console.log('e:ytplayer:onReady');
                                //Scale player
                                var containerWidth = $element[0].clientWidth;
                                player.getIframe().width = containerWidth;
                                player.getIframe().height = containerWidth * 0.5625;

                                player.seekTo(scope.clip.start_time / 1000, true);
                                //player.playVideo();
                            },
                            'onStateChange': function() {
                                if (player.getPlayerState() == 1 && !loopStarted) {
                                    $rootScope.$emit('clipStarted');
                                    loopStarted = true;
                                    loop();
                                }
                            }
                        }
                    });
                }

                initInterval = $interval(function() {
                    if (YT && YT.Player) {
                        $interval.cancel(initInterval);
                        initYoutube();
                    }
                }, 25);

                function changeClip(clip) {
                    player.destroy();
                    scope.clip = clip;
                    // console.log(scope.clip);
                    initYoutube();
                }

                $scope.$on('$destroy', function() {
                    console.log('e:$destroy');

                    player.pauseVideo();
                    $timeout.cancel(restartTimer);
                    $interval.cancel(initInterval);
                })

                $rootScope.$on('answerGiven', function(e) {
                    player.pauseVideo();
                })

                $rootScope.$on('clipChanged', function(e, c) {
                    changeClip(c)
                });

            }
        };

    });
angular.module('App')
    .directive('resultpopup', function(Api, $timeout, $interval) {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'directives/resultpopup.html',
            scope: {
                //snip:    "=snip",
                options: "=options",
                visible: "=visible",
                infos: "=infos"
            },
            controllerAs: 'ResultPopup',
            bindToController: true,
            controller: function($scope, $element, $rootScope) {
                var scope = this;

                scope.getURLGif = function() {
                    return './img/gif/' + scope.options.quizz.channel + '/' + (scope.infos.answer.is_correct ? 'correct' : 'wrong') + '/' + Math.floor(Math.random() * (scope.infos.answer.is_correct ? scope.options.quizz.gifs.correct : scope.options.quizz.gifs.wrong) + 1) + ".gif"
                }

                scope.initURLGif = function() {
                    scope.urlGIF = scope.getURLGif();
                }

                scope.nextClip = function() {
                    scope.initURLGif();
                    $rootScope.$emit('nextClip');
                }

                scope.show = function() {
                    scope.visible = true;
                }

                $rootScope.$on('nextClip', function(e) {
                    scope.visible = false;
                });

                $rootScope.$on('answerGiven', function(e, infos) {
                    scope.show();
                    scope.infos.answer = infos;
                    scope.initURLGif();

                })
            }
        };

    });
angular.module('App').service('Api', function($http, $q, Config, $timeout) {


    /**
     * Perform an API call.
     * @param options {url, params, data, callback, method, errorHandler (should return true), timeout in MS, blockUI}
     */
    this.call = function(options) {

        var options = angular.extend({
            url: null,
            method: 'GET',
            params: null,
            data: null,
            callback: null,
            timeout: 30000,
            errorHandler: null,
            blockUI: true,
        }, options);

        var canceler = $q.defer();
        var cancelTimeout = options.timeout ? $timeout(canceler.resolve, options.timeout) : null;


        var url = options.url.indexOf('http') == 0 ? options.url : Config.apiBase + options.url;

        $http({
            url: url,
            method: options.method,
            params: options.params,
            data: options.data,
            timeout: canceler.promise
        }).success(function(data) {
            $timeout.cancel(cancelTimeout);
            if (typeof options.callback == 'function') {
                options.callback(data);
            }
        }).error(function(message, status) {
            $timeout.cancel(cancelTimeout);

            if (typeof options.errorHandler == 'function' && options.errorHandler(message, status)) {
                //Error was handled by the custom error handler
                return;
            }

            if (!status) {
                console.log("Error without status; request aborted?");
                return;
            }

        });

        return {
            cancel: function() {
                canceler.resolve();
            }
        };

    };

});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvcXVpenouanMiLCJkaXJlY3RpdmVzL3BsYXllci5qcyIsImRpcmVjdGl2ZXMvcmVzdWx0cG9wdXAuanMiLCJzZXJ2aWNlL2FwaS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdBcHAnLCBbJ3RlbXBsYXRlcycsICd1aS5yb3V0ZXInLCAnbmdBbmltYXRlJywgJ25nUm91dGUnLCAnYW5ndWxhck1vbWVudCddKVxyXG5cclxuLmNvbnN0YW50KCdDb25maWcnLCB7XHJcbiAgICBhcGlCYXNlOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIFwiL2FwaS9cIlxyXG59KVxyXG5cclxuLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCAkc2NlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XHJcblxyXG4gICAgJHNjZVByb3ZpZGVyLmVuYWJsZWQoZmFsc2UpO1xyXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xyXG5cclxuICAgICRzdGF0ZVByb3ZpZGVyXHJcbiAgICAgICAgLnN0YXRlKCdxdWl6eicsIHtcclxuICAgICAgICAgICAgdXJsOiAnLycsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAncXVpenovaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdRdWl6ekN0cmwgYXMgUXVpenonXHJcbiAgICAgICAgfSkuc3RhdGUoJzQwNCcsIHtcclxuICAgICAgICAgICAgdXJsOiAnLzQwNCcsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZXJyb3JzLzQwNC5odG1sJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoZnVuY3Rpb24oJGluamVjdG9yKSB7XHJcbiAgICAgICAgdmFyICRzdGF0ZTtcclxuICAgICAgICAkc3RhdGUgPSAkaW5qZWN0b3IuZ2V0KCckc3RhdGUnKTtcclxuICAgICAgICByZXR1cm4gJHN0YXRlLmdvKCc0MDQnLCBudWxsLCB7XHJcbiAgICAgICAgICAgIGxvY2F0aW9uOiBmYWxzZVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG59KVxyXG5cclxuLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsICR0aW1lb3V0KSB7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kc3RhdGUgPSAkc3RhdGU7XHJcbiAgICAkcm9vdFNjb3BlLk1hdGggPSBNYXRoO1xyXG5cclxuICAgICRyb290U2NvcGUuc2FmZUFwcGx5ID0gZnVuY3Rpb24gc2FmZUFwcGx5KG9wZXJhdGlvbikge1xyXG4gICAgICAgIHZhciBwaGFzZSA9IHRoaXMuJHJvb3QuJCRwaGFzZTtcclxuICAgICAgICBpZiAocGhhc2UgIT09ICckYXBwbHknICYmIHBoYXNlICE9PSAnJGRpZ2VzdCcpIHtcclxuICAgICAgICAgICAgdGhpcy4kYXBwbHkob3BlcmF0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wZXJhdGlvbiAmJiB0eXBlb2Ygb3BlcmF0aW9uID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wZXJhdGlvbigpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG59KVxyXG5cclxuXHJcbi8vUHJvYmFibHkgc2hvdWxkIG1vdmUgdGhpcyBpZiB3ZSBnZXQgbW9yZSB1dGlsIHNoaXRlXHJcbi5maWx0ZXIoJ3RpbWUnLCBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbihtcywgcHJlY2lzZSkge1xyXG5cclxuICAgICAgICB2YXIgdG90YWxTZWNvbmRzID0gbXMgLyAxMDAwO1xyXG5cclxuICAgICAgICB2YXIgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAvIDM2MDApO1xyXG4gICAgICAgIHZhciBtaW51dGVzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgJSAzNjAwIC8gNjApO1xyXG4gICAgICAgIHZhciBzZWNvbmRzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgJSA2MCk7XHJcbiAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IE1hdGguZmxvb3IobXMgJSAxMDAwKTtcclxuXHJcbiAgICAgICAgdmFyIHJldDtcclxuICAgICAgICByZXQgPSBob3VycyA/IGhvdXJzICsgXCI6XCIgOiBcIlwiO1xyXG4gICAgICAgIHJldCArPSAobWludXRlcyB8fCBob3VycykgfHwgIXByZWNpc2UgPyAobWludXRlcyA8IDEwID8gJzAnICsgbWludXRlcyA6IG1pbnV0ZXMpICsgXCI6XCIgOiBcIlwiO1xyXG4gICAgICAgIHJldCArPSBzZWNvbmRzIDwgMTAgJiYgIXByZWNpc2UgPyAnMCcgKyBzZWNvbmRzIDogc2Vjb25kcztcclxuICAgICAgICByZXQgKz0gcHJlY2lzZSA/ICcuJyArIChtaWxsaXNlY29uZHMgPCAxMCA/ICcwMCcgKyBtaWxsaXNlY29uZHMgOiAobWlsbGlzZWNvbmRzIDwgMTAwID8gJzAnICsgbWlsbGlzZWNvbmRzIDogbWlsbGlzZWNvbmRzKSkgOiBcIlwiO1xyXG5cclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgfTtcclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuY29udHJvbGxlcignUXVpenpDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGksICR0aW1lb3V0KSB7XHJcblxyXG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcbiAgICAgICAgc2NvcGUubG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgc2NvcGUudGltZXIgPSAwOyAvLyBpbiBNU1xyXG5cclxuICAgICAgICBzY29wZS5jbGlwT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBzY29wZS5jbGlwcyA9IFt7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIk1VVCBNVVQgw4lDQVJURVotVk9VUyAoRXVybyBUcnVjayBTaW11bGF0b3IgMilcIixcclxuICAgICAgICAgICAgdmlkZW9faWQ6ICdBRFVKODdXeHlwNCcsXHJcbiAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvQURVSjg3V3h5cDQvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgIHN0YXJ0X3RpbWU6IDE4MTI4NSxcclxuICAgICAgICAgICAgZHVyYXRpb246IDE5MTcyXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICB0aXRsZTogXCJFVCBNQUlOVEVOQU5ULCBGRVJNRSBUQSBHVUVVTEUgKERheVopXCIsXHJcbiAgICAgICAgICAgIHZpZGVvX2lkOiAnODBqRHBkaDR3QmMnLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpLzgwakRwZGg0d0JjL21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICBzdGFydF90aW1lOiA0NjYxNDUsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiAxODY4MVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiSidBUFBSRU5EUkUgTEEgU1VSVklFIEVUIExBIENPTkpVR0FJU09OIChIMVoxIEJhdHRsZSBSb3lhbGUpXCIsXHJcbiAgICAgICAgICAgIHZpZGVvX2lkOiAnLS02RVFlSnFmOEUnLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpLy0tNkVRZUpxZjhFL21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICBzdGFydF90aW1lOiA0NTA1OTMsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiAyMzE2MFxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiSidBUFBSRU5EUkUgTEEgU1VSVklFIEVUIExBIENPTkpVR0FJU09OIChIMVoxIEJhdHRsZSBSb3lhbGUpXCIsXHJcbiAgICAgICAgICAgIHZpZGVvX2lkOiAnLS02RVFlSnFmOEUnLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpLy0tNkVRZUpxZjhFL21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICBzdGFydF90aW1lOiA0MzUxNzAsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiAxNDgzMFxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiRVQgSidBSSBDUkFNw4kgKEhhbGYtTGlmZSAyIGVuIENPT1ApXCIsXHJcbiAgICAgICAgICAgIHZpZGVvX2lkOiAnaS1FTFJNTzN2SFEnLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpL2ktRUxSTU8zdkhRL21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICBzdGFydF90aW1lOiA3MDE0ODMsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAwXHJcbiAgICAgICAgfV07XHJcblxyXG4gICAgICAgIHNjb3BlLmFjdHVhbFBvc2l0aW9uID0gMDtcclxuXHJcbiAgICAgICAgc2NvcGUudmlkZW9zID0gW107XHJcblxyXG4gICAgICAgIHNjb3BlLmFuc3dlcnMgPSBbXTtcclxuXHJcbiAgICAgICAgc2NvcGUuYW5zd2Vyc0xvYWRlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBzY29wZS5wZXJjZW50VGltZXJMZWZ0ID0gMTAwO1xyXG4gICAgICAgIHNjb3BlLnBvdGVudGlhbFBvaW50cyA9IDMwMDtcclxuXHJcbiAgICAgICAgc2NvcGUudXNlclNjb3JlID0gMDtcclxuXHJcbiAgICAgICAgc2NvcGUucG9wdXBWaXNpYmxlID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHNjb3BlLnBvcHVwT3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgcXVpeno6IHtcclxuICAgICAgICAgICAgICAgIGNoYW5uZWw6ICd3YW5raWwnLFxyXG4gICAgICAgICAgICAgICAgZ2lmczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvcnJlY3Q6IDgsXHJcbiAgICAgICAgICAgICAgICAgICAgd3Jvbmc6IDRcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUucG9wdXBJbmZvcyA9IHtcclxuICAgICAgICAgICAgYW5zd2VyOiB7XHJcbiAgICAgICAgICAgICAgICBwb2ludHM6IDEwLFxyXG4gICAgICAgICAgICAgICAgaXNfY29ycmVjdDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG5leHQ6IHRydWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZW5kX2dhbWU6IHtcclxuXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHR5cGU6ICdhbnN3ZXInXHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUuaW5pdENsaXAgPSBmdW5jdGlvbihwb3NpdGlvbikge1xyXG4gICAgICAgICAgICBjbGlwID0gc2NvcGUuY2xpcHNbcG9zaXRpb25dO1xyXG4gICAgICAgICAgICBzY29wZS5jbGlwT3B0aW9ucyA9IGNsaXA7XHJcbiAgICAgICAgICAgIHNjb3BlLmFjdHVhbFBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ2NsaXBDaGFuZ2VkJywgY2xpcCk7XHJcbiAgICAgICAgICAgIHNjb3BlLmlzVGltZVVwID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbiAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5nZXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnJlc2V0VGltZXIoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUubmV4dENsaXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgYWN0dWFsUG9zaXRpb24gPSBzY29wZS5hY3R1YWxQb3NpdGlvbjtcclxuICAgICAgICAgICAgaWYgKGFjdHVhbFBvc2l0aW9uICsgMSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRDbGlwKGFjdHVhbFBvc2l0aW9uICsgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldFZpZGVvcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9rZXk9QUl6YVN5Qk1EclZobWlSMkF2M2NCZm0yX1JNN1hWdkQ2dWRMd3VvJmNoYW5uZWxJZD1VQ1lHanhvNWlmdWhubXZoUHZDYzNESlEmcGFydD1zbmlwcGV0Jm9yZGVyPWRhdGUmbWF4UmVzdWx0cz01MCZ0eXBlPXZpZGVvJyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudmlkZW9zID0gcmVzLml0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmdldEFuc3dlcnMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmRlbGV0ZUFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuYW5zd2VycyA9IFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUucmFuZG9taXplVmlkZW9zID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnZpZGVvcyA9IHNjb3BlLnNodWZmbGUoc2NvcGUudmlkZW9zKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnNodWZmbGUgPSBmdW5jdGlvbihhKSB7XHJcbiAgICAgICAgICAgIHZhciBqLCB4LCBpO1xyXG4gICAgICAgICAgICBmb3IgKGkgPSBhLmxlbmd0aDsgaTsgaS0tKSB7XHJcbiAgICAgICAgICAgICAgICBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSk7XHJcbiAgICAgICAgICAgICAgICB4ID0gYVtpIC0gMV07XHJcbiAgICAgICAgICAgICAgICBhW2kgLSAxXSA9IGFbal07XHJcbiAgICAgICAgICAgICAgICBhW2pdID0geDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gYTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldEFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuYW5zd2Vyc0xvYWRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzY29wZS5yYW5kb21pemVWaWRlb3MoKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmFuc3dlcnNbaV0gPSBzY29wZS52aWRlb3NbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUuYW5zd2Vyc1szXSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9JZDogc2NvcGUuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnZpZGVvX2lkXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc25pcHBldDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBzY29wZS5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udGl0bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZWRpdW06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogc2NvcGUuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnRodW1ibmFpbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNjb3BlLmFuc3dlcnMgPSBzY29wZS5zaHVmZmxlKHNjb3BlLmFuc3dlcnMpO1xyXG4gICAgICAgICAgICBzY29wZS5hbnN3ZXJzTG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUuYW5zd2Vycyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5hbnN3ZXIgPSBmdW5jdGlvbihhKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0b3BUaW1lcigpO1xyXG5cclxuICAgICAgICAgICAgY3VycmVudF9jbGlwX2lkID0gc2NvcGUuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnZpZGVvX2lkO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudF9jbGlwX2lkID09IGEpIHtcclxuICAgICAgICAgICAgICAgIGlzX2NvcnJlY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaXNfY29ycmVjdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNjb3BlLnVwZGF0ZVVzZXJTY29yZShpc19jb3JyZWN0KTtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnYW5zd2VyR2l2ZW4nLCB7XHJcbiAgICAgICAgICAgICAgICBpc19jb3JyZWN0OiBpc19jb3JyZWN0LFxyXG4gICAgICAgICAgICAgICAgcG9pbnRzOiBzY29wZS51c2VyU2NvcmUsXHJcbiAgICAgICAgICAgICAgICBuZXh0OiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBzY29wZS5uZXh0Q2xpcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuc3RhcnRUaW1lciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS50aW1lciA9IDA7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyVGltZW91dCA9ICR0aW1lb3V0KHNjb3BlLm9uVGltZW91dCwgMTAwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnJlc2V0VGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuc3RvcFRpbWVyKCk7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLm9uVGltZW91dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBUT0RPIDogZ2V0IHJpZCBvZiB0aGlzXHJcbiAgICAgICAgICAgIGlmIChzY29wZS50aW1lciA+PSBzY29wZS5nZXRDaG9pY2VEdXJhdG9uKCkpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVJc1VwKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUudGltZXIrKztcclxuICAgICAgICAgICAgc2NvcGUudXBkYXRlVUkoKTtcclxuICAgICAgICAgICAgc2NvcGUudGltZXJUaW1lb3V0ID0gJHRpbWVvdXQoc2NvcGUub25UaW1lb3V0LCAxMDApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlUGVyY2VudFRpbWVyTGVmdCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvL1RPRE8gOiBtYWtlIGl0IGxlc3MgZnJlcXVlbnRcclxuICAgICAgICAgICAgc2NvcGUucGVyY2VudFRpbWVyTGVmdCA9IChzY29wZS5nZXRDaG9pY2VEdXJhdG9uKCkgLSAoc2NvcGUudGltZXIpKSAvIHNjb3BlLmdldENob2ljZUR1cmF0b24oKSAqIDEwMDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUucGVyY2VudFRpbWVyTGVmdCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlVUkgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudXBkYXRlUGVyY2VudFRpbWVyTGVmdCgpO1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmNhbGN1bGF0ZVBvdGVudGlhbFBvaW50cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvL1RPRE8gOiBjYWxjdWxhdGUgYWNjb3JkaW5nbHkgdG8gdGhlIGxldmVsXHJcbiAgICAgICAgICAgIHZhciBwb2ludHNGb3JUaGlzQ2xpcCA9IDMwMDsgLy8gVE9ETyA6IGdldCBwb2ludHMgZm9yIGEgY2xpcCAhXHJcbiAgICAgICAgICAgIHBvdGVudGlhbFBvaW50cyA9IE1hdGgucm91bmQocG9pbnRzRm9yVGhpc0NsaXAgLSBzY29wZS50aW1lciAqIChwb2ludHNGb3JUaGlzQ2xpcCAvIHNjb3BlLmdldENob2ljZUR1cmF0b24oKSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gcG90ZW50aWFsUG9pbnRzO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldFNjb3JlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBwb3RlbnRpYWxQb2ludHMgPSBzY29wZS5jYWxjdWxhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHBvdGVudGlhbFBvaW50czogcG90ZW50aWFsUG9pbnRzLFxyXG4gICAgICAgICAgICAgICAgd3JvbmdQb2ludHM6IHNjb3BlLmlzVGltZVVwID8gLSgzMDAgLyAyKSA6IE1hdGgucm91bmQoLU1hdGguYWJzKHBvdGVudGlhbFBvaW50cykgLyAxLjUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldENob2ljZUR1cmF0b24gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIG51bWJlck9mTGV2ZWxzID0gMTA7IC8vVE9ETyA6IGdldCBudW1iZXIgb2YgbGV2ZWxzXHJcbiAgICAgICAgICAgIHZhciBtaW5DaG9pY2VEdXJhdGlvbiA9IDEwICogMTA7IC8vMTAgc2VjXHJcbiAgICAgICAgICAgIHZhciBtYXhDaG9pY2VEdXJhdGlvbiA9IDMwICogMTA7IC8vIDMwIHNlY1xyXG4gICAgICAgICAgICB2YXIgY3VycmVudExldmVsID0gMTA7IC8vIFRPRE8gOiBnZXQgY3VycmVudCBsZXZlbFxyXG5cclxuICAgICAgICAgICAgYiA9IChtaW5DaG9pY2VEdXJhdGlvbiAtIG1heENob2ljZUR1cmF0aW9uKSAvIChudW1iZXJPZkxldmVscyAtIDEpO1xyXG4gICAgICAgICAgICBjID0gYiAqIChjdXJyZW50TGV2ZWwgLSAxKSArIG1heENob2ljZUR1cmF0aW9uO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhjKTtcclxuICAgICAgICAgICAgcmV0dXJuIGM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5zdG9wVGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLnRpbWVyVGltZW91dCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS50aW1lSXNVcCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5pc1RpbWVVcCA9IHRydWU7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0b3BUaW1lcigpO1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVVc2VyU2NvcmUoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlVXNlclNjb3JlID0gZnVuY3Rpb24oaXNfY29ycmVjdCkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInVwZGF0ZVVzZXJTY29yZVwiKTtcclxuICAgICAgICAgICAgc2NvcmUgPSBzY29wZS5nZXRTY29yZSgpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29yZSk7XHJcbiAgICAgICAgICAgIGlmIChpc19jb3JyZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyU2NvcmUgKz0gc2NvcmUucG90ZW50aWFsUG9pbnRzO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudXNlclNjb3JlICs9IHNjb3JlLndyb25nUG9pbnRzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS51cGRhdGVQb3RlbnRpYWxQb2ludHMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUucG90ZW50aWFsUG9pbnRzID0gc2NvcGUuY2FsY3VsYXRlUG90ZW50aWFsUG9pbnRzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbignbmV4dENsaXAnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlOm5leHRDbGlwJyk7XHJcbiAgICAgICAgICAgIHNjb3BlLm5leHRDbGlwKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKCdjbGlwU3RhcnRlZCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJlOmNsaXBTdGFydGVkXCIpO1xyXG4gICAgICAgICAgICBzY29wZS5zdGFydFRpbWVyKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICBzY29wZS5pbml0Q2xpcCgwKTtcclxuICAgICAgICBzY29wZS5nZXRWaWRlb3MoKTtcclxuXHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuZGlyZWN0aXZlKCdwbGF5ZXInLCBmdW5jdGlvbihBcGksICR0aW1lb3V0LCAkaW50ZXJ2YWwpIHtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3BsYXllci5odG1sJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIC8vc25pcDogICAgXCI9c25pcFwiLFxyXG4gICAgICAgICAgICAgICAgY2xpcDogXCI9Y2xpcFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ1BsYXllcicsXHJcbiAgICAgICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQsICRyb290U2NvcGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIHBsYXllciwgcmVzdGFydFRpbWVyLCBsb29wU3RhcnRlZCwgaW5pdEludGVydmFsO1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGxvb3AoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvb3Agc3RhcnRlZCA6IHN0ID0gJyArIHNjb3BlLmNsaXAuc3RhcnRfdGltZSArICcgfCBkdXJhdGlvbiA9ICcgKyBzY29wZS5jbGlwLmR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuc2Vla1RvKHNjb3BlLmNsaXAuc3RhcnRfdGltZSAvIDEwMDAsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHBsYXllci5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwocmVzdGFydFRpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN0YXJ0VGltZXIgPSAkdGltZW91dChsb29wLCBzY29wZS5jbGlwLmR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0WW91dHViZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaW5pdFlvdXR1YmUnKTtcclxuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllciA9IG5ldyBZVC5QbGF5ZXIoJ3l0cGxheWVyJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICc0MDAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXJWYXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sczogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYXV0b2hpZGU6ICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvcGxheTogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVrYjogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWpzYXBpOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnM6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2Rlc3RicmFuZGluZzogMSwgLy9vbmx5IHdvcmtzIHdpdGggY29udHJvbHMgZW5hYmxlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheXNpbmxpbmU6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93aW5mbzogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZW1lOiAnZGFyaycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSWQ6IHNjb3BlLmNsaXAudmlkZW9faWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50czoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ29uUmVhZHknOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZTp5dHBsYXllcjpvblJlYWR5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9TY2FsZSBwbGF5ZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udGFpbmVyV2lkdGggPSAkZWxlbWVudFswXS5jbGllbnRXaWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuZ2V0SWZyYW1lKCkud2lkdGggPSBjb250YWluZXJXaWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuZ2V0SWZyYW1lKCkuaGVpZ2h0ID0gY29udGFpbmVyV2lkdGggKiAwLjU2MjU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5zZWVrVG8oc2NvcGUuY2xpcC5zdGFydF90aW1lIC8gMTAwMCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9wbGF5ZXIucGxheVZpZGVvKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ29uU3RhdGVDaGFuZ2UnOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGxheWVyLmdldFBsYXllclN0YXRlKCkgPT0gMSAmJiAhbG9vcFN0YXJ0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnY2xpcFN0YXJ0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaW5pdEludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChZVCAmJiBZVC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbml0SW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0WW91dHViZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIDI1KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGFuZ2VDbGlwKGNsaXApIHtcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuZGVzdHJveSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmNsaXAgPSBjbGlwO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHNjb3BlLmNsaXApO1xyXG4gICAgICAgICAgICAgICAgICAgIGluaXRZb3V0dWJlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZTokZGVzdHJveScpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIucGF1c2VWaWRlbygpO1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChyZXN0YXJ0VGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW5pdEludGVydmFsKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ2Fuc3dlckdpdmVuJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5wYXVzZVZpZGVvKCk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCdjbGlwQ2hhbmdlZCcsIGZ1bmN0aW9uKGUsIGMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VDbGlwKGMpXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG4gICAgLmRpcmVjdGl2ZSgncmVzdWx0cG9wdXAnLCBmdW5jdGlvbihBcGksICR0aW1lb3V0LCAkaW50ZXJ2YWwpIHtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3Jlc3VsdHBvcHVwLmh0bWwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgLy9zbmlwOiAgICBcIj1zbmlwXCIsXHJcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBcIj1vcHRpb25zXCIsXHJcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBcIj12aXNpYmxlXCIsXHJcbiAgICAgICAgICAgICAgICBpbmZvczogXCI9aW5mb3NcIlxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICdSZXN1bHRQb3B1cCcsXHJcbiAgICAgICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQsICRyb290U2NvcGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuZ2V0VVJMR2lmID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcuL2ltZy9naWYvJyArIHNjb3BlLm9wdGlvbnMucXVpenouY2hhbm5lbCArICcvJyArIChzY29wZS5pbmZvcy5hbnN3ZXIuaXNfY29ycmVjdCA/ICdjb3JyZWN0JyA6ICd3cm9uZycpICsgJy8nICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKHNjb3BlLmluZm9zLmFuc3dlci5pc19jb3JyZWN0ID8gc2NvcGUub3B0aW9ucy5xdWl6ei5naWZzLmNvcnJlY3QgOiBzY29wZS5vcHRpb25zLnF1aXp6LmdpZnMud3JvbmcpICsgMSkgKyBcIi5naWZcIlxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRVUkxHaWYgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS51cmxHSUYgPSBzY29wZS5nZXRVUkxHaWYoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5uZXh0Q2xpcCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmluaXRVUkxHaWYoKTtcclxuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCduZXh0Q2xpcCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLnNob3cgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignbmV4dENsaXAnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ2Fuc3dlckdpdmVuJywgZnVuY3Rpb24oZSwgaW5mb3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaW5mb3MuYW5zd2VyID0gaW5mb3M7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaW5pdFVSTEdpZigpO1xyXG5cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdBcGknLCBmdW5jdGlvbigkaHR0cCwgJHEsIENvbmZpZywgJHRpbWVvdXQpIHtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQZXJmb3JtIGFuIEFQSSBjYWxsLlxyXG4gICAgICogQHBhcmFtIG9wdGlvbnMge3VybCwgcGFyYW1zLCBkYXRhLCBjYWxsYmFjaywgbWV0aG9kLCBlcnJvckhhbmRsZXIgKHNob3VsZCByZXR1cm4gdHJ1ZSksIHRpbWVvdXQgaW4gTVMsIGJsb2NrVUl9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuY2FsbCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuXHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBhbmd1bGFyLmV4dGVuZCh7XHJcbiAgICAgICAgICAgIHVybDogbnVsbCxcclxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgcGFyYW1zOiBudWxsLFxyXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogbnVsbCxcclxuICAgICAgICAgICAgdGltZW91dDogMzAwMDAsXHJcbiAgICAgICAgICAgIGVycm9ySGFuZGxlcjogbnVsbCxcclxuICAgICAgICAgICAgYmxvY2tVSTogdHJ1ZSxcclxuICAgICAgICB9LCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgdmFyIGNhbmNlbGVyID0gJHEuZGVmZXIoKTtcclxuICAgICAgICB2YXIgY2FuY2VsVGltZW91dCA9IG9wdGlvbnMudGltZW91dCA/ICR0aW1lb3V0KGNhbmNlbGVyLnJlc29sdmUsIG9wdGlvbnMudGltZW91dCkgOiBudWxsO1xyXG5cclxuXHJcbiAgICAgICAgdmFyIHVybCA9IG9wdGlvbnMudXJsLmluZGV4T2YoJ2h0dHAnKSA9PSAwID8gb3B0aW9ucy51cmwgOiBDb25maWcuYXBpQmFzZSArIG9wdGlvbnMudXJsO1xyXG5cclxuICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICBtZXRob2Q6IG9wdGlvbnMubWV0aG9kLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zLFxyXG4gICAgICAgICAgICBkYXRhOiBvcHRpb25zLmRhdGEsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNhbmNlbGVyLnByb21pc2VcclxuICAgICAgICB9KS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGNhbmNlbFRpbWVvdXQpO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5jYWxsYmFjayhkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKG1lc3NhZ2UsIHN0YXR1cykge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuZXJyb3JIYW5kbGVyID09ICdmdW5jdGlvbicgJiYgb3B0aW9ucy5lcnJvckhhbmRsZXIobWVzc2FnZSwgc3RhdHVzKSkge1xyXG4gICAgICAgICAgICAgICAgLy9FcnJvciB3YXMgaGFuZGxlZCBieSB0aGUgY3VzdG9tIGVycm9yIGhhbmRsZXJcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFzdGF0dXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3Igd2l0aG91dCBzdGF0dXM7IHJlcXVlc3QgYWJvcnRlZD9cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNhbmNlbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxlci5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiXX0=
