var SelfUpdatingView = Marionette.ItemView.extend({
    modelEvents: {
        'change': function() {this.render();}
    }
});


var QuestionTextView = SelfUpdatingView.extend({ template: '#question_text_template' });
var HelpTextView = SelfUpdatingView.extend({ template: '#help_text_template' });
var ErrorView = SelfUpdatingView.extend({ template: '#error_template' });

//this thing can swap out it's contents
var MPQView = Marionette.Layout.extend({
    template: '#mpq_template',
    regions: {
        mpq: '.mpq'
    },
    modelEvents: {
        'change:next_question': 'nextQuestion'
    },

    onRender: function() {
        this.mpq.show(new MPQPView({model: this.model}));
    },

    nextQuestion: function() {
        var next =  new window[this.model.get('next_question')]({model: this.model}) ;
        this.mpq.show(next);
    }

});

//this is the default content
var MPQPView = Marionette.ItemView.extend({
    template: '#mpqp',
    events: {
        'click .doSomething': 'onDoSomething',
        'click .doSomethingElse': 'onDoSomethingElse'
    },

    initialize: function() {
        this.i = 0;
    },

    onDoSomething: function(e) {
        e.stopPropagation();
        e.preventDefault();
        this.i++;
        this.model.set({
            question_text: 'You did '+this.i+' thing(s).',
            help_text: 'If you click Do Something you will be up to '+ (1+this.i) +' things.'
        });
    },

    onDoSomethingElse: function(e) {
        e.stopPropagation();
        e.preventDefault();

        this.model.set({
            question_text: 'You did something else',
            help_text: 'i guess you are done now',
            next_question: 'MPQP2View'
        });
    }
});


var MPQP2View = Marionette.ItemView.extend({
    template: '#mpqp2'
});


var QuestionView = Marionette.Layout.extend({
    template: '#question_template',

    regions: {
        answers: '.answers_container',
        question_text: '.question_text',
        help_text: '.help_text',
        error_text: '.error'
    },

    initialize: function() {
        this.model.set({
            question_text: this.options.question_definition.question_text,
            help_text: this.options.question_definition.help_text,
            val: this.options.question_definition.val
        });
    },
    onRender: function() {
        this.answers.show(new MPQView({model: this.model}));
        this.question_text.show(new QuestionTextView({model: this.model}));
        this.help_text.show(new HelpTextView({model: this.model}));
        this.error_text.show(new ErrorView({model: this.model}));
    }
});



var QuestionDataModel = Backbone.Model.extend({
    defaults: {
        val: '',
        message: '',
        question_text: '',
        help_text: ''
    }
});