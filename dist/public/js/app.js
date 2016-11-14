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

        scope.level = {
            number: 1,
            clips_count: 5,
            clips_total: 500,
            clips: [{
                title: "MUT MUT ÉCARTEZ-VOUS (Euro Truck Simulator 2)",
                video_id: 'ADUJ87Wxyp4',
                thumbnail: 'https://i.ytimg.com/vi/ADUJ87Wxyp4/mqdefault.jpg',
                start_time: 181285,
                duration: 19172,
                points: 300
            }, {
                title: "ET MAINTENANT, FERME TA GUEULE (DayZ)",
                video_id: '80jDpdh4wBc',
                thumbnail: 'https://i.ytimg.com/vi/80jDpdh4wBc/mqdefault.jpg',
                start_time: 466145,
                duration: 18681,
                points: 300
            }, {
                title: "J'APPRENDRE LA SURVIE ET LA CONJUGAISON (H1Z1 Battle Royale)",
                video_id: '--6EQeJqf8E',
                thumbnail: 'https://i.ytimg.com/vi/--6EQeJqf8E/mqdefault.jpg',
                start_time: 450593,
                duration: 23160,
                points: 300
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
                duration: 5000,
                points: 300
            }]
        };

        scope.actualPosition = 0;

        scope.videos = [];

        scope.currentAnswers = [];

        scope.currentAnswersLoaded = false;

        scope.percentTimerLeft = 100;
        scope.potentialPoints = 300;

        scope.userScore = 0;

        scope.popup = {
            visible: false,
            options: {
                quizz: {
                    channel: 'wankil',
                    gifs: {
                        correct: 8,
                        wrong: 4
                    },
                    number_levels: 10
                }
            },
            infos: {
                answer: {
                    points: 10,
                    is_correct: true,
                    next: true
                },
                end_game: {

                },
                type: 'answer'
            }
        }


        scope.initClip = function(position) {
            clip = scope.level.clips[position];
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
                scope.currentAnswersLoaded = false;
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
            scope.currentAnswers = [];
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
            scope.currentAnswersLoaded = false;
            scope.randomizeVideos();
            for (var i = 0; i < 3; i++) {
                scope.currentAnswers[i] = scope.videos[i];
            }
            scope.currentAnswers[3] = {
                id: {
                    videoId: scope.level.clips[scope.actualPosition].video_id
                },
                snippet: {
                    title: scope.level.clips[scope.actualPosition].title,
                    thumbnails: {
                        medium: {
                            url: scope.level.clips[scope.actualPosition].thumbnail
                        }
                    }
                }
            }
            scope.currentAnswers = scope.shuffle(scope.currentAnswers);
            scope.currentAnswersLoaded = true;
            // console.log(scope.currentAnswers);
        }

        scope.answer = function(a) {
            scope.stopTimer();

            current_clip_id = scope.level.clips[scope.actualPosition].video_id;
            if (current_clip_id == a) {
                is_correct = true;
            } else {
                is_correct = false;
            }
            gainedPoints = scope.updateUserScore(is_correct);
            $rootScope.$emit('answerGiven', {
                is_correct: is_correct,
                points: gainedPoints,
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
                wrongPoints: scope.isTimeUp ? -(scope.level.clips[scope.actualPosition].points / 2) : Math.round(-Math.abs(potentialPoints) / 1.5)
            }
        }

        scope.getChoiceDuraton = function() {
            var numberOfLevels = scope.popup.options.quizz.number_levels;
            var minChoiceDuration = 10 * 10; //10 sec
            var maxChoiceDuration = 30 * 10; // 30 sec
            var currentLevel = scope.level.number; // TODO : get current level

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
                scope.userScore = scope.userScore + score.potentialPoints;
                return score.potentialPoints;
            } else {
                scope.userScore = scope.userScore + score.wrongPoints;
                return score.wrongPoints;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvcXVpenouanMiLCJkaXJlY3RpdmVzL3BsYXllci5qcyIsImRpcmVjdGl2ZXMvcmVzdWx0cG9wdXAuanMiLCJzZXJ2aWNlL2FwaS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ0FwcCcsIFsndGVtcGxhdGVzJywgJ3VpLnJvdXRlcicsICduZ0FuaW1hdGUnLCAnbmdSb3V0ZScsICdhbmd1bGFyTW9tZW50J10pXHJcblxyXG4uY29uc3RhbnQoJ0NvbmZpZycsIHtcclxuICAgIGFwaUJhc2U6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvYXBpL1wiXHJcbn0pXHJcblxyXG4uY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuXHJcbiAgICAkc2NlUHJvdmlkZXIuZW5hYmxlZChmYWxzZSk7XHJcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXJcclxuICAgICAgICAuc3RhdGUoJ3F1aXp6Jywge1xyXG4gICAgICAgICAgICB1cmw6ICcvJyxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdxdWl6ei9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogJ1F1aXp6Q3RybCBhcyBRdWl6eidcclxuICAgICAgICB9KS5zdGF0ZSgnNDA0Jywge1xyXG4gICAgICAgICAgICB1cmw6ICcvNDA0JyxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdlcnJvcnMvNDA0Lmh0bWwnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbigkaW5qZWN0b3IpIHtcclxuICAgICAgICB2YXIgJHN0YXRlO1xyXG4gICAgICAgICRzdGF0ZSA9ICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgIHJldHVybiAkc3RhdGUuZ28oJzQwNCcsIG51bGwsIHtcclxuICAgICAgICAgICAgbG9jYXRpb246IGZhbHNlXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbn0pXHJcblxyXG4ucnVuKGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgJHRpbWVvdXQpIHtcclxuXHJcbiAgICAkcm9vdFNjb3BlLiRzdGF0ZSA9ICRzdGF0ZTtcclxuICAgICRyb290U2NvcGUuTWF0aCA9IE1hdGg7XHJcblxyXG4gICAgJHJvb3RTY29wZS5zYWZlQXBwbHkgPSBmdW5jdGlvbiBzYWZlQXBwbHkob3BlcmF0aW9uKSB7XHJcbiAgICAgICAgdmFyIHBoYXNlID0gdGhpcy4kcm9vdC4kJHBoYXNlO1xyXG4gICAgICAgIGlmIChwaGFzZSAhPT0gJyRhcHBseScgJiYgcGhhc2UgIT09ICckZGlnZXN0Jykge1xyXG4gICAgICAgICAgICB0aGlzLiRhcHBseShvcGVyYXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3BlcmF0aW9uICYmIHR5cGVvZiBvcGVyYXRpb24gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgb3BlcmF0aW9uKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pXHJcblxyXG5cclxuLy9Qcm9iYWJseSBzaG91bGQgbW92ZSB0aGlzIGlmIHdlIGdldCBtb3JlIHV0aWwgc2hpdGVcclxuLmZpbHRlcigndGltZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG1zLCBwcmVjaXNlKSB7XHJcblxyXG4gICAgICAgIHZhciB0b3RhbFNlY29uZHMgPSBtcyAvIDEwMDA7XHJcblxyXG4gICAgICAgIHZhciBob3VycyA9IE1hdGguZmxvb3IodG90YWxTZWNvbmRzIC8gMzYwMCk7XHJcbiAgICAgICAgdmFyIG1pbnV0ZXMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAlIDM2MDAgLyA2MCk7XHJcbiAgICAgICAgdmFyIHNlY29uZHMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAlIDYwKTtcclxuICAgICAgICB2YXIgbWlsbGlzZWNvbmRzID0gTWF0aC5mbG9vcihtcyAlIDEwMDApO1xyXG5cclxuICAgICAgICB2YXIgcmV0O1xyXG4gICAgICAgIHJldCA9IGhvdXJzID8gaG91cnMgKyBcIjpcIiA6IFwiXCI7XHJcbiAgICAgICAgcmV0ICs9IChtaW51dGVzIHx8IGhvdXJzKSB8fCAhcHJlY2lzZSA/IChtaW51dGVzIDwgMTAgPyAnMCcgKyBtaW51dGVzIDogbWludXRlcykgKyBcIjpcIiA6IFwiXCI7XHJcbiAgICAgICAgcmV0ICs9IHNlY29uZHMgPCAxMCAmJiAhcHJlY2lzZSA/ICcwJyArIHNlY29uZHMgOiBzZWNvbmRzO1xyXG4gICAgICAgIHJldCArPSBwcmVjaXNlID8gJy4nICsgKG1pbGxpc2Vjb25kcyA8IDEwID8gJzAwJyArIG1pbGxpc2Vjb25kcyA6IChtaWxsaXNlY29uZHMgPCAxMDAgPyAnMCcgKyBtaWxsaXNlY29uZHMgOiBtaWxsaXNlY29uZHMpKSA6IFwiXCI7XHJcblxyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9O1xyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5jb250cm9sbGVyKCdRdWl6ekN0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEFwaSwgJHRpbWVvdXQpIHtcclxuXHJcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuICAgICAgICBzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICBzY29wZS50aW1lciA9IDA7IC8vIGluIE1TXHJcblxyXG4gICAgICAgIHNjb3BlLmNsaXBPcHRpb25zID0ge307XHJcblxyXG4gICAgICAgIHNjb3BlLmxldmVsID0ge1xyXG4gICAgICAgICAgICBudW1iZXI6IDEsXHJcbiAgICAgICAgICAgIGNsaXBzX2NvdW50OiA1LFxyXG4gICAgICAgICAgICBjbGlwc190b3RhbDogNTAwLFxyXG4gICAgICAgICAgICBjbGlwczogW3tcclxuICAgICAgICAgICAgICAgIHRpdGxlOiBcIk1VVCBNVVQgw4lDQVJURVotVk9VUyAoRXVybyBUcnVjayBTaW11bGF0b3IgMilcIixcclxuICAgICAgICAgICAgICAgIHZpZGVvX2lkOiAnQURVSjg3V3h5cDQnLFxyXG4gICAgICAgICAgICAgICAgdGh1bWJuYWlsOiAnaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS9BRFVKODdXeHlwNC9tcWRlZmF1bHQuanBnJyxcclxuICAgICAgICAgICAgICAgIHN0YXJ0X3RpbWU6IDE4MTI4NSxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxOTE3MixcclxuICAgICAgICAgICAgICAgIHBvaW50czogMzAwXHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIHRpdGxlOiBcIkVUIE1BSU5URU5BTlQsIEZFUk1FIFRBIEdVRVVMRSAoRGF5WilcIixcclxuICAgICAgICAgICAgICAgIHZpZGVvX2lkOiAnODBqRHBkaDR3QmMnLFxyXG4gICAgICAgICAgICAgICAgdGh1bWJuYWlsOiAnaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS84MGpEcGRoNHdCYy9tcWRlZmF1bHQuanBnJyxcclxuICAgICAgICAgICAgICAgIHN0YXJ0X3RpbWU6IDQ2NjE0NSxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAxODY4MSxcclxuICAgICAgICAgICAgICAgIHBvaW50czogMzAwXHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIHRpdGxlOiBcIkonQVBQUkVORFJFIExBIFNVUlZJRSBFVCBMQSBDT05KVUdBSVNPTiAoSDFaMSBCYXR0bGUgUm95YWxlKVwiLFxyXG4gICAgICAgICAgICAgICAgdmlkZW9faWQ6ICctLTZFUWVKcWY4RScsXHJcbiAgICAgICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpLy0tNkVRZUpxZjhFL21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICAgICAgc3RhcnRfdGltZTogNDUwNTkzLFxyXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDIzMTYwLFxyXG4gICAgICAgICAgICAgICAgcG9pbnRzOiAzMDBcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6IFwiSidBUFBSRU5EUkUgTEEgU1VSVklFIEVUIExBIENPTkpVR0FJU09OIChIMVoxIEJhdHRsZSBSb3lhbGUpXCIsXHJcbiAgICAgICAgICAgICAgICB2aWRlb19pZDogJy0tNkVRZUpxZjhFJyxcclxuICAgICAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvLS02RVFlSnFmOEUvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgICAgICBzdGFydF90aW1lOiA0MzUxNzAsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMTQ4MzBcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6IFwiRVQgSidBSSBDUkFNw4kgKEhhbGYtTGlmZSAyIGVuIENPT1ApXCIsXHJcbiAgICAgICAgICAgICAgICB2aWRlb19pZDogJ2ktRUxSTU8zdkhRJyxcclxuICAgICAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvaS1FTFJNTzN2SFEvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgICAgICBzdGFydF90aW1lOiA3MDE0ODMsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwMCxcclxuICAgICAgICAgICAgICAgIHBvaW50czogMzAwXHJcbiAgICAgICAgICAgIH1dXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2NvcGUuYWN0dWFsUG9zaXRpb24gPSAwO1xyXG5cclxuICAgICAgICBzY29wZS52aWRlb3MgPSBbXTtcclxuXHJcbiAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnMgPSBbXTtcclxuXHJcbiAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnNMb2FkZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgc2NvcGUucGVyY2VudFRpbWVyTGVmdCA9IDEwMDtcclxuICAgICAgICBzY29wZS5wb3RlbnRpYWxQb2ludHMgPSAzMDA7XHJcblxyXG4gICAgICAgIHNjb3BlLnVzZXJTY29yZSA9IDA7XHJcblxyXG4gICAgICAgIHNjb3BlLnBvcHVwID0ge1xyXG4gICAgICAgICAgICB2aXNpYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgcXVpeno6IHtcclxuICAgICAgICAgICAgICAgICAgICBjaGFubmVsOiAnd2Fua2lsJyxcclxuICAgICAgICAgICAgICAgICAgICBnaWZzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvcnJlY3Q6IDgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyb25nOiA0XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBudW1iZXJfbGV2ZWxzOiAxMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBpbmZvczoge1xyXG4gICAgICAgICAgICAgICAgYW5zd2VyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRzOiAxMCxcclxuICAgICAgICAgICAgICAgICAgICBpc19jb3JyZWN0OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBlbmRfZ2FtZToge1xyXG5cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnYW5zd2VyJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUuaW5pdENsaXAgPSBmdW5jdGlvbihwb3NpdGlvbikge1xyXG4gICAgICAgICAgICBjbGlwID0gc2NvcGUubGV2ZWwuY2xpcHNbcG9zaXRpb25dO1xyXG4gICAgICAgICAgICBzY29wZS5jbGlwT3B0aW9ucyA9IGNsaXA7XHJcbiAgICAgICAgICAgIHNjb3BlLmFjdHVhbFBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ2NsaXBDaGFuZ2VkJywgY2xpcCk7XHJcbiAgICAgICAgICAgIHNjb3BlLmlzVGltZVVwID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbiAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5nZXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnJlc2V0VGltZXIoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUubmV4dENsaXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgYWN0dWFsUG9zaXRpb24gPSBzY29wZS5hY3R1YWxQb3NpdGlvbjtcclxuICAgICAgICAgICAgaWYgKGFjdHVhbFBvc2l0aW9uICsgMSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzTG9hZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5pbml0Q2xpcChhY3R1YWxQb3NpdGlvbiArIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5nZXRWaWRlb3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20veW91dHViZS92My9zZWFyY2g/a2V5PUFJemFTeUJNRHJWaG1pUjJBdjNjQmZtMl9STTdYVnZENnVkTHd1byZjaGFubmVsSWQ9VUNZR2p4bzVpZnVobm12aFB2Q2MzREpRJnBhcnQ9c25pcHBldCZvcmRlcj1kYXRlJm1heFJlc3VsdHM9NTAmdHlwZT12aWRlbycsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZpZGVvcyA9IHJlcy5pdGVtcztcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5nZXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5kZWxldGVBbnN3ZXJzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5yYW5kb21pemVWaWRlb3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudmlkZW9zID0gc2NvcGUuc2h1ZmZsZShzY29wZS52aWRlb3MpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuc2h1ZmZsZSA9IGZ1bmN0aW9uKGEpIHtcclxuICAgICAgICAgICAgdmFyIGosIHgsIGk7XHJcbiAgICAgICAgICAgIGZvciAoaSA9IGEubGVuZ3RoOyBpOyBpLS0pIHtcclxuICAgICAgICAgICAgICAgIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpKTtcclxuICAgICAgICAgICAgICAgIHggPSBhW2kgLSAxXTtcclxuICAgICAgICAgICAgICAgIGFbaSAtIDFdID0gYVtqXTtcclxuICAgICAgICAgICAgICAgIGFbal0gPSB4O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuZ2V0QW5zd2VycyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5jdXJyZW50QW5zd2Vyc0xvYWRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzY29wZS5yYW5kb21pemVWaWRlb3MoKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzW2ldID0gc2NvcGUudmlkZW9zW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzWzNdID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB2aWRlb0lkOiBzY29wZS5sZXZlbC5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udmlkZW9faWRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzbmlwcGV0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHNjb3BlLmxldmVsLmNsaXBzW3Njb3BlLmFjdHVhbFBvc2l0aW9uXS50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lZGl1bToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBzY29wZS5sZXZlbC5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udGh1bWJuYWlsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnMgPSBzY29wZS5zaHVmZmxlKHNjb3BlLmN1cnJlbnRBbnN3ZXJzKTtcclxuICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnNMb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29wZS5jdXJyZW50QW5zd2Vycyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5hbnN3ZXIgPSBmdW5jdGlvbihhKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0b3BUaW1lcigpO1xyXG5cclxuICAgICAgICAgICAgY3VycmVudF9jbGlwX2lkID0gc2NvcGUubGV2ZWwuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnZpZGVvX2lkO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudF9jbGlwX2lkID09IGEpIHtcclxuICAgICAgICAgICAgICAgIGlzX2NvcnJlY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaXNfY29ycmVjdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdhaW5lZFBvaW50cyA9IHNjb3BlLnVwZGF0ZVVzZXJTY29yZShpc19jb3JyZWN0KTtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnYW5zd2VyR2l2ZW4nLCB7XHJcbiAgICAgICAgICAgICAgICBpc19jb3JyZWN0OiBpc19jb3JyZWN0LFxyXG4gICAgICAgICAgICAgICAgcG9pbnRzOiBnYWluZWRQb2ludHMsXHJcbiAgICAgICAgICAgICAgICBuZXh0OiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBzY29wZS5uZXh0Q2xpcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuc3RhcnRUaW1lciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS50aW1lciA9IDA7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyVGltZW91dCA9ICR0aW1lb3V0KHNjb3BlLm9uVGltZW91dCwgMTAwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnJlc2V0VGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuc3RvcFRpbWVyKCk7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLm9uVGltZW91dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBUT0RPIDogZ2V0IHJpZCBvZiB0aGlzXHJcbiAgICAgICAgICAgIGlmIChzY29wZS50aW1lciA+PSBzY29wZS5nZXRDaG9pY2VEdXJhdG9uKCkpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVJc1VwKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUudGltZXIrKztcclxuICAgICAgICAgICAgc2NvcGUudXBkYXRlVUkoKTtcclxuICAgICAgICAgICAgc2NvcGUudGltZXJUaW1lb3V0ID0gJHRpbWVvdXQoc2NvcGUub25UaW1lb3V0LCAxMDApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlUGVyY2VudFRpbWVyTGVmdCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvL1RPRE8gOiBtYWtlIGl0IGxlc3MgZnJlcXVlbnRcclxuICAgICAgICAgICAgc2NvcGUucGVyY2VudFRpbWVyTGVmdCA9IChzY29wZS5nZXRDaG9pY2VEdXJhdG9uKCkgLSAoc2NvcGUudGltZXIpKSAvIHNjb3BlLmdldENob2ljZUR1cmF0b24oKSAqIDEwMDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUucGVyY2VudFRpbWVyTGVmdCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlVUkgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudXBkYXRlUGVyY2VudFRpbWVyTGVmdCgpO1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmNhbGN1bGF0ZVBvdGVudGlhbFBvaW50cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvL1RPRE8gOiBjYWxjdWxhdGUgYWNjb3JkaW5nbHkgdG8gdGhlIGxldmVsXHJcbiAgICAgICAgICAgIHZhciBwb2ludHNGb3JUaGlzQ2xpcCA9IDMwMDsgLy8gVE9ETyA6IGdldCBwb2ludHMgZm9yIGEgY2xpcCAhXHJcbiAgICAgICAgICAgIHBvdGVudGlhbFBvaW50cyA9IE1hdGgucm91bmQocG9pbnRzRm9yVGhpc0NsaXAgLSBzY29wZS50aW1lciAqIChwb2ludHNGb3JUaGlzQ2xpcCAvIHNjb3BlLmdldENob2ljZUR1cmF0b24oKSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gcG90ZW50aWFsUG9pbnRzO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldFNjb3JlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBwb3RlbnRpYWxQb2ludHMgPSBzY29wZS5jYWxjdWxhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHBvdGVudGlhbFBvaW50czogcG90ZW50aWFsUG9pbnRzLFxyXG4gICAgICAgICAgICAgICAgd3JvbmdQb2ludHM6IHNjb3BlLmlzVGltZVVwID8gLShzY29wZS5sZXZlbC5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0ucG9pbnRzIC8gMikgOiBNYXRoLnJvdW5kKC1NYXRoLmFicyhwb3RlbnRpYWxQb2ludHMpIC8gMS41KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5nZXRDaG9pY2VEdXJhdG9uID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBudW1iZXJPZkxldmVscyA9IHNjb3BlLnBvcHVwLm9wdGlvbnMucXVpenoubnVtYmVyX2xldmVscztcclxuICAgICAgICAgICAgdmFyIG1pbkNob2ljZUR1cmF0aW9uID0gMTAgKiAxMDsgLy8xMCBzZWNcclxuICAgICAgICAgICAgdmFyIG1heENob2ljZUR1cmF0aW9uID0gMzAgKiAxMDsgLy8gMzAgc2VjXHJcbiAgICAgICAgICAgIHZhciBjdXJyZW50TGV2ZWwgPSBzY29wZS5sZXZlbC5udW1iZXI7IC8vIFRPRE8gOiBnZXQgY3VycmVudCBsZXZlbFxyXG5cclxuICAgICAgICAgICAgYiA9IChtaW5DaG9pY2VEdXJhdGlvbiAtIG1heENob2ljZUR1cmF0aW9uKSAvIChudW1iZXJPZkxldmVscyAtIDEpO1xyXG4gICAgICAgICAgICBjID0gYiAqIChjdXJyZW50TGV2ZWwgLSAxKSArIG1heENob2ljZUR1cmF0aW9uO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhjKTtcclxuICAgICAgICAgICAgcmV0dXJuIGM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5zdG9wVGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLnRpbWVyVGltZW91dCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS50aW1lSXNVcCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5pc1RpbWVVcCA9IHRydWU7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0b3BUaW1lcigpO1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVVc2VyU2NvcmUoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlVXNlclNjb3JlID0gZnVuY3Rpb24oaXNfY29ycmVjdCkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInVwZGF0ZVVzZXJTY29yZVwiKTtcclxuICAgICAgICAgICAgc2NvcmUgPSBzY29wZS5nZXRTY29yZSgpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29yZSk7XHJcbiAgICAgICAgICAgIGlmIChpc19jb3JyZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyU2NvcmUgPSBzY29wZS51c2VyU2NvcmUgKyBzY29yZS5wb3RlbnRpYWxQb2ludHM7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcmUucG90ZW50aWFsUG9pbnRzO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudXNlclNjb3JlID0gc2NvcGUudXNlclNjb3JlICsgc2NvcmUud3JvbmdQb2ludHM7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcmUud3JvbmdQb2ludHM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnVwZGF0ZVBvdGVudGlhbFBvaW50cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5wb3RlbnRpYWxQb2ludHMgPSBzY29wZS5jYWxjdWxhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKCduZXh0Q2xpcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2U6bmV4dENsaXAnKTtcclxuICAgICAgICAgICAgc2NvcGUubmV4dENsaXAoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oJ2NsaXBTdGFydGVkJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImU6Y2xpcFN0YXJ0ZWRcIik7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0YXJ0VGltZXIoKTtcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIHNjb3BlLmluaXRDbGlwKDApO1xyXG4gICAgICAgIHNjb3BlLmdldFZpZGVvcygpO1xyXG5cclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5kaXJlY3RpdmUoJ3BsYXllcicsIGZ1bmN0aW9uKEFwaSwgJHRpbWVvdXQsICRpbnRlcnZhbCkge1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvcGxheWVyLmh0bWwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgLy9zbmlwOiAgICBcIj1zbmlwXCIsXHJcbiAgICAgICAgICAgICAgICBjbGlwOiBcIj1jbGlwXCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAnUGxheWVyJyxcclxuICAgICAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgJHJvb3RTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgcGxheWVyLCByZXN0YXJ0VGltZXIsIGxvb3BTdGFydGVkLCBpbml0SW50ZXJ2YWw7XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gbG9vcCgpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbG9vcCBzdGFydGVkIDogc3QgPSAnICsgc2NvcGUuY2xpcC5zdGFydF90aW1lICsgJyB8IGR1cmF0aW9uID0gJyArIHNjb3BlLmNsaXAuZHVyYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5zZWVrVG8oc2NvcGUuY2xpcC5zdGFydF90aW1lIC8gMTAwMCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheWVyLnBsYXlWaWRlbygpO1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChyZXN0YXJ0VGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3RhcnRUaW1lciA9ICR0aW1lb3V0KGxvb3AsIHNjb3BlLmNsaXAuZHVyYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRZb3V0dWJlKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdpbml0WW91dHViZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyID0gbmV3IFlULlBsYXllcigneXRwbGF5ZXInLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogJzQwMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAnMTAwJScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllclZhcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hdXRvaGlkZTogICAgICAgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9wbGF5OiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWtiOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlanNhcGk6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmczogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVzdGJyYW5kaW5nOiAxLCAvL29ubHkgd29ya3Mgd2l0aCBjb250cm9scyBlbmFibGVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5c2lubGluZTogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3dpbmZvOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVsOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlbWU6ICdkYXJrJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9JZDogc2NvcGUuY2xpcC52aWRlb19pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb25SZWFkeSc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlOnl0cGxheWVyOm9uUmVhZHknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1NjYWxlIHBsYXllclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb250YWluZXJXaWR0aCA9ICRlbGVtZW50WzBdLmNsaWVudFdpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5nZXRJZnJhbWUoKS53aWR0aCA9IGNvbnRhaW5lcldpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5nZXRJZnJhbWUoKS5oZWlnaHQgPSBjb250YWluZXJXaWR0aCAqIDAuNTYyNTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyLnNlZWtUbyhzY29wZS5jbGlwLnN0YXJ0X3RpbWUgLyAxMDAwLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL3BsYXllci5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb25TdGF0ZUNoYW5nZSc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKSA9PSAxICYmICFsb29wU3RhcnRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdjbGlwU3RhcnRlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpbml0SW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFlUICYmIFlULlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGluaXRJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluaXRZb3V0dWJlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgMjUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoYW5nZUNsaXAoY2xpcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuY2xpcCA9IGNsaXA7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUuY2xpcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5pdFlvdXR1YmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlOiRkZXN0cm95Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5wYXVzZVZpZGVvKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHJlc3RhcnRUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbml0SW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignYW5zd2VyR2l2ZW4nLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLnBhdXNlVmlkZW8oKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ2NsaXBDaGFuZ2VkJywgZnVuY3Rpb24oZSwgYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZUNsaXAoYylcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuZGlyZWN0aXZlKCdyZXN1bHRwb3B1cCcsIGZ1bmN0aW9uKEFwaSwgJHRpbWVvdXQsICRpbnRlcnZhbCkge1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvcmVzdWx0cG9wdXAuaHRtbCcsXHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICAvL3NuaXA6ICAgIFwiPXNuaXBcIixcclxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IFwiPW9wdGlvbnNcIixcclxuICAgICAgICAgICAgICAgIHZpc2libGU6IFwiPXZpc2libGVcIixcclxuICAgICAgICAgICAgICAgIGluZm9zOiBcIj1pbmZvc1wiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ1Jlc3VsdFBvcHVwJyxcclxuICAgICAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgJHJvb3RTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5nZXRVUkxHaWYgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJy4vaW1nL2dpZi8nICsgc2NvcGUub3B0aW9ucy5xdWl6ei5jaGFubmVsICsgJy8nICsgKHNjb3BlLmluZm9zLmFuc3dlci5pc19jb3JyZWN0ID8gJ2NvcnJlY3QnIDogJ3dyb25nJykgKyAnLycgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoc2NvcGUuaW5mb3MuYW5zd2VyLmlzX2NvcnJlY3QgPyBzY29wZS5vcHRpb25zLnF1aXp6LmdpZnMuY29ycmVjdCA6IHNjb3BlLm9wdGlvbnMucXVpenouZ2lmcy53cm9uZykgKyAxKSArIFwiLmdpZlwiXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuaW5pdFVSTEdpZiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVybEdJRiA9IHNjb3BlLmdldFVSTEdpZigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLm5leHRDbGlwID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaW5pdFVSTEdpZigpO1xyXG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ25leHRDbGlwJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvdyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCduZXh0Q2xpcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignYW5zd2VyR2l2ZW4nLCBmdW5jdGlvbihlLCBpbmZvcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnNob3coKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pbmZvcy5hbnN3ZXIgPSBpbmZvcztcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pbml0VVJMR2lmKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0FwaScsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQ29uZmlnLCAkdGltZW91dCkge1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlcmZvcm0gYW4gQVBJIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7dXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrLCBtZXRob2QsIGVycm9ySGFuZGxlciAoc2hvdWxkIHJldHVybiB0cnVlKSwgdGltZW91dCBpbiBNUywgYmxvY2tVSX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWxsID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGFuZ3VsYXIuZXh0ZW5kKHtcclxuICAgICAgICAgICAgdXJsOiBudWxsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG51bGwsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBudWxsLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgZXJyb3JIYW5kbGVyOiBudWxsLFxyXG4gICAgICAgICAgICBibG9ja1VJOiB0cnVlLFxyXG4gICAgICAgIH0sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgY2FuY2VsZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIHZhciBjYW5jZWxUaW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8gJHRpbWVvdXQoY2FuY2VsZXIucmVzb2x2ZSwgb3B0aW9ucy50aW1lb3V0KSA6IG51bGw7XHJcblxyXG5cclxuICAgICAgICB2YXIgdXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignaHR0cCcpID09IDAgPyBvcHRpb25zLnVybCA6IENvbmZpZy5hcGlCYXNlICsgb3B0aW9ucy51cmw7XHJcblxyXG4gICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogb3B0aW9ucy5tZXRob2QsXHJcbiAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMsXHJcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMuZGF0YSxcclxuICAgICAgICAgICAgdGltZW91dDogY2FuY2VsZXIucHJvbWlzZVxyXG4gICAgICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmNhbGxiYWNrKGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24obWVzc2FnZSwgc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckhhbmRsZXIgPT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLmVycm9ySGFuZGxlcihtZXNzYWdlLCBzdGF0dXMpKSB7XHJcbiAgICAgICAgICAgICAgICAvL0Vycm9yIHdhcyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gZXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aXRob3V0IHN0YXR1czsgcmVxdWVzdCBhYm9ydGVkP1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2FuY2VsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGNhbmNlbGVyLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyJdfQ==
