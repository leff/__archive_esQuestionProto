var QuestionDataModel = Backbone.Model.extend({
    defaults: {
        field: '',
        val: ''
    }
});

var QuestionMeta = Backbone.Model.extend({
    defaults: {
        question_text: '',
        help_text: '',
        answer_type: '', //Select, Slider, Etc
        answer_details: {}
    }
});
var QuestionMetaStack = Backbone.Collection.extend({
    model: QuestionMeta
});


//
// Question asks a single question
// it can either accept an input or ask a followup question
//
// it has a Answers View, which is responsible for collecting the input,
// which can be of any type
//
// In other words, Question encapsulates the common stuff about asking a question
// without saying anything about how that question is answered
//
var Question = Marionette.Layout.extend({
    template: '#question',

    ui: {
        reset: '.reset'
    },

    regions: {
        answers: '.answers'
    },

    events: {
        'click @ui.reset': 'onResetClick'
    },

    initialize: function() {
        this.$el.addClass('question-box expanded');
        var that = this;

        this.answers.on('show', function(view){
            that.listenTo(view, 'dataWasInput', that.onDataInput);
            that.listenTo(view, 'followupRequested', that.onFollowupRequested);
        });
    },

    onRender: function() {
        var answer_type = this.model.get('answer_type');

        var answers = new window[answer_type]({details: this.model.get('answer_details')});
        this.answers.show(answers);
    },

    collapse_ui: function() {
        this.$el.removeClass('expanded').addClass('collapsed');
    },
    expand_ui: function() {
        this.$el.removeClass('collapsed').addClass('expanded');
    },
    onDataInput: function(data) { this.trigger('dataWasInput', data); },
    onFollowupRequested: function(followup) { this.trigger('followupRequested', followup); },
    onResetClick: function() { this.trigger('resetRequested'); }
});


//
// QuestionStack is a collection of Questions
//
//
var QuestionStack = Marionette.CollectionView.extend({
    itemView: Question,

    itemEvents: {
        dataWasInput: 'onDataInput',
        followupRequested: 'onFollowupRequested',
        resetRequested: 'onResetRequested'
    },

    onDataInput: function(event_name, child, data) { this.trigger('dataWasInput', data); },

    onFollowupRequested: function(event_name, child, followup) {
        // QuestionStack can handle the whole ui operation
        // but QuestionAsker needs to know to reset the data.
        this.trigger('resetRequested');
        this.children.each(function(q) {
            q.collapse_ui();
        });
        this.collection.add( new QuestionMeta(followup) );
    },

    onResetRequested: function(event_name, child) {
        while( this.collection.last() != child.model ) {
            this.collection.pop();
        }
        this.children.last().expand_ui();
        this.trigger('resetRequested');
    }
});


//
// QuestionAsker is the interface between the
// page/form and the complicated way we ask questions in the UI
//
// It maps from the one bit of data we're looking for to the
// many levels of UI we may use to collect it.
//
// Therefore it is responsible for things that are 1 to 1 with
// the data model, such as 'done-ness' and 'valid-ness'
//
var QuestionAsker = Marionette.Layout.extend({
    template: '#question_asker',
    regions: {
        quesiton_stack: '.question-stack',
        status: '.status',
        error: '.error'
    },

    modelEvents: {
        change: 'onModelChange'
    },

    initialize: function() {
        var that = this;

        this.quesiton_stack.on('show', function(view){
            that.listenTo(view, 'dataWasInput', that.onDataInput);
            that.listenTo(view, 'resetRequested', that.onResetRequested);
        });
    },

    onRender: function() {
        this.question_meta_model = new QuestionMetaStack();
        this.question_meta_model.add( new QuestionMeta(this.options.question_definition) );
        this.quesiton_stack.show(new QuestionStack({collection: this.question_meta_model}));
    },

    onDataInput: function(data) {
        this.model.set('val', data);
        //trigger done ui state
    },

    onResetRequested: function() {
        // could possibly use model.unset. not sure if it matters.
        this.model.set('val', undefined);
    },

    onModelChange: function() {
        var data = this.model.get('val');
        console.log('data is now', data);
    }

});


// SelectAnswers is a type of AnswerView
// Ie, it can be slotted in to the Answers spot of a Question
var SelectAnswers = Marionette.ItemView.extend({
    template: '#select_answers',

    ui: {
        some_input: '.an_input',
        answer: '.answer'
    },

    events: {
        'click @ui.some_input': 'onSomeRandomInput',
        'click @ui.answer': 'onAnswerClick'
    },

    initialize: function() {
        this.answers = this.options.details.answers;
    },

    serializeData: function() {
        return {
            answers: this.answers
        };
    },

    onAnswerClick: function(evt) {
        var selected_data_id = parseInt( $(evt.target).attr('data-id'), 10 );
        var answer = _.findWhere(this.answers, {id: selected_data_id});
        if( answer.val ) {
            this.trigger( 'dataWasInput',  answer.val);
        } else if (answer.followup) {
            this.trigger( 'followupRequested', answer.followup );
        }
    },

    onSomeRandomInput: function() { this.trigger('dataWasInput', 'IamData'); }
});



