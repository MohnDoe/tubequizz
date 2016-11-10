angular.module('App')
    .controller('QuizzCtrl', function($rootScope, $state, Api) {

        var scope = this;
        scope.loading = true;

        scope.clipOptions = {};

        scope.clips = [{
            title: "Wankil - 14/05/2014",
            video_id: 'ADUJ87Wxyp4',
            start_time: 181285,
            duration: 19172
        }, {
            title: "Wankil - AB+ - 8/10",
            video_id: '80jDpdh4wBc',
            start_time: 466145,
            duration: 18681
        }, {
            title: "Wankil - La conjugaison - 3/10",
            video_id: '--6EQeJqf8E',
            start_time: 450593,
            duration: 23160
        }, {
            title: "Wankil - Comme si p't'êt' - 5/10",
            video_id: '--6EQeJqf8E',
            start_time: 435170,
            duration: 14830
        }, {
            title: "Wankil - 14/05/2014",
            video_id: 'i-ELRMO3vHQ',
            start_time: 701483,
            duration: 5000
        }];

        scope.actualPosition = 0;

        scope.initClip = function(position) {
            clip = scope.clips[position];
            scope.clipOptions = clip;
            scope.actualPosition = position;
            $rootScope.$emit('clipChanged', clip);
        }

        scope.initClip(0);


        scope.nextClip = function() {
            actualPosition = scope.actualPosition;
            if (actualPosition + 1 < 5) {
                scope.initClip(actualPosition + 1);
            }
        }


        //scope.p = $state.params;

    });