var App = {
    Lib:{
        
        Selection:function(_name, _idx, _altName) {
            this.name = _name;
            this.index = _idx;
            this.altName = _altName;
        },
        
        
    },

    parse:function(src) {
        var blocks = ccparser.parse(src);

        var dims = getDims(blocks);

        return { dimensions:dims, structure:blocks };

        function getDims(blocks) {
            var dimensions = [];

            for (var idx = 0; idx < blocks.length; ++idx) {
                if (blocks[idx].type == "dim") {
                    dimensions.push(blocks[idx]);
                }
                else if (blocks[idx].type == "choice") {
                    for (
                        var cidx = 0; 
                        cidx < blocks[idx].choices[cidx]; 
                        ++cidx) {

                        dimensions = dimensions.concat(
                            getDims(
                                blocks[idx].choices[cidx]
                            )
                        );
                    }


                    dimensions = dimensions.concat(
                        getDims(blocks[idx].choices).concat(
                            
                        )
                    );
                }
            }

            return dimensions;
        }
    },
    
    parseInput:function() {
        return App.parse(
            $("#editor").text()
        );
    },
    
    updateChoiceList:function() {
        $("#choiceDisplay li:not(.special)").remove();
        
        try {
            var choices = App.parseInput().dimensions;
            
            $.each(
                choices,
                function(idx, choice) {
                    var listItem = $("<li><a></a><ul></ul></li>");
                    
                    var menuId = choice.name + "_menu";
                    
                    listItem
                        .addClass("dropdown")
                        .find("a")
                            .html(
                                    choice.name 
                                +   "<b class=\"caret\"></b>"
                            )
                            .attr("data-choice-name", choice.name)
                            .addClass("dropdown-toggle")
                            .attr("data-toggle", "dropdown");
                            //.attr("href", "#" + menuId);
                    
                    var ul = listItem
                        .find("ul")
                            .addClass("dropdown-menu")
                            .attr("id", menuId);
                            
                    for (var idx = 0; idx < choice.tags.length; ++idx) {
                        $("<li><a/></li>")
                            .find("a")
                                .attr("href", "#_")
                                .text(choice.tags[idx])
                                .attr("data-alternative-index", idx)
                                .attr("data-alternative-name", choice.tags[idx])
                                .on(
                                    "click",
                                    function() {
                                        var 
                                            choiceName = $(this)
                                                .parents(".dropdown")
                                                .find(".dropdown-toggle")
                                                    .attr("data-choice-name"),
                                            alternativeIndex = $(this)
                                                .attr("data-alternative-index"),
                                            alternativeName = $(this)
                                                .attr("data-alternative-name");
                                        
                                        App.updateSelection(
                                            choiceName, 
                                            alternativeIndex,
                                            alternativeName
                                        );
                                        
                                        App.updateSelectionDisplay();
                                    }
                                )
                                .addClass("alternativeLink")
                                .end()
                            .appendTo(ul);
                    }
                        
                    listItem
                        .find("a")
                            .dropdown()
                            .end()
                        .appendTo("#choiceDisplay");
                }
            );
            
            for (var idx = 0; idx < App.currentSelection.length; ++idx) {
                var name = App.currentSelection[idx].name;
                
                if (!$(".dropdown-toggle[data-choice-name='" + name + "']").length) {
                    App.currentSelection.splice(idx, 1);
                }
            }
            
        }
        
        catch (exc) {
            $("<li><a/></li>")
                .find("a")
                    .attr("href", "#_")
                    .text(exc || "Unknown")
                    .end()
                .addClass("exceptionDisplay")
                .appendTo("#choiceDisplay");
        }
    },
    
    selectionByName:function(name, selection) {
        for (var idx = 0; idx < selection.length; ++idx) {
            if (selection[idx].name == name) {
                return selection[idx].index;
            }
        }
        
        return null;
    },
    
    evalSelection:function(nodes, selection) {
        var res = "";

        for (var idx = 0; idx < nodes.length; ++idx) {
            var node = nodes[idx];

            if (node.type == "code") {
                res += node.code;
            }
            
            else if (node.type == "choice") {
                
                var sel = App.selectionByName(
                    node.name, 
                    selection
                );
                
                if (sel == null) {
                    throw "Unselected choice \"" + node.name + "\"";
                }
                
                if (sel > node.choices.length) {
                    throw "Choice has insufficient alternatives for dimension.";
                }
                
                res += App.evalSelection(
                    node.choices[1 * sel],
                    selection
                );
            }
        }

        return res;
    },
    
    currentSelection:[],
    
    updateSelection:function(name, selectionIndex, alternativeName) {
        for (var idx = 0; idx < App.currentSelection.length; ++idx) {
            if (App.currentSelection[idx].name == name) {
                App.currentSelection[idx].index = selectionIndex;
                App.currentSelection[idx].altName = alternativeName;
                return;
            }
        }
        
        App.currentSelection.push(
            new App.Lib.Selection(
                name, 
                selectionIndex,
                alternativeName
            )
        );
    },
    
    updateSelectionDisplay:function() {
        $("#selectionDisplay").text(
            "{ " +
            $.map(
                App.currentSelection,
                function(elem) {
                    return elem.name + "." + elem.altName;
                }
            )
            .join(", ") +
            " }"
        );
    }
};


$(function() {
    $("#editor")
        .on("keyup", function() {
            App.updateChoiceList();
        })
        .trigger("keyup");
    
    $("#ccButton").on("click", function() {
        try {
            var evaluation = App.evalSelection(
                App.parseInput().structure,
                App.currentSelection
            );
        
            $("#resolve .modal-body #result-content")
                .text(
                    evaluation
                );
        }
        catch(exc) {
            $("#resolve .modal-body #result-content")
                .text(
                    "Failed evaluating: " + exc
                );
        }
        
        $("#resolve").modal({ show:true });
            
        return false;
    });
    
});
