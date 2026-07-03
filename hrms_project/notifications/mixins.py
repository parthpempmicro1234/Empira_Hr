class MentionableModelMixin:
    """
    Inherit on models where @display_name mentions should be scanned.
    """
    mention_fields = []

    def get_mention_actor(self):
        raise NotImplementedError(
            "Models inheriting from MentionableModelMixin must implement "
            "get_mention_actor()."
        )

    def get_mention_extra_data(self):
        return {}
