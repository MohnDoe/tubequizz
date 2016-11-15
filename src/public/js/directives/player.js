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
                scope.player = null;
                var player, restartTimer, loopStarted, initInterval;

                function loop() {
                    console.log('loop started : st = ' + scope.clip.start_time + ' | duration = ' + scope.clip.duration);
                    scope.player.seekTo(scope.clip.start_time / 1000, true);
                    // scope.player.playVideo();
                    $timeout.cancel(restartTimer);
                    restartTimer = $timeout(loop, scope.clip.duration);
                }

                function initYoutube() {
                    // console.log('initYoutube');
                    loopStarted = false;
                    scope.player = new YT.Player('ytplayer', {
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
                            'onReady': function(e) {
                                e.target.setVolume(75);
                                console.log('e:ytplayer:onReady');
                                //Scale player
                                var containerWidth = $element[0].clientWidth;
                                e.target.getIframe().width = containerWidth;
                                e.target.getIframe().height = containerWidth * 0.5625;

                                e.target.seekTo(scope.clip.start_time / 1000, true);
                                //e.target.playVideo();
                            },
                            'onStateChange': function(e) {
                                if (scope.player.getPlayerState() == 1 && !loopStarted) {
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
                    if (scope.player) {
                        scope.player.destroy();
                        scope.clip = clip;
                        // console.log(scope.clip);
                        initYoutube();

                    }
                }

                $scope.$on('$destroy', function() {
                    console.log('e:$destroy');

                    scope.player.pauseVideo();
                    $timeout.cancel(restartTimer);
                    $interval.cancel(initInterval);
                })

                $rootScope.$on('answerGiven', function(e) {
                    scope.player.pauseVideo();
                })

                $rootScope.$on('clipChanged', function(e, c) {
                    changeClip(c)
                });

            }
        };

    });