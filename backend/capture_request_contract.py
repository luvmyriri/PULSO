"""Optional client-observed camera location request; not proof of accuracy."""
from typing import Literal
from pydantic import AwareDatetime,BaseModel,ConfigDict,model_validator


class CameraLocationRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    schema_version:Literal['camera-location-request-v1']='camera-location-request-v1'
    started_at:AwareDatetime|None
    finished_at:AwareDatetime|None
    first_fix_received_at:AwareDatetime|None
    outcome:Literal['success','denied','timeout','unavailable','unsupported','cancelled','not_requested']
    end_reason:Literal['capture','deadline','permission_denied','provider_error','unsupported','hidden','stopped','not_started']

    @model_validator(mode='after')
    def chronology(self):
        if self.outcome=='not_requested':
            if any((self.started_at,self.finished_at,self.first_fix_received_at)) or self.end_reason!='not_started':
                raise ValueError('An unrequested acquisition cannot carry request times.')
            return self
        if not self.started_at or not self.finished_at or self.finished_at<self.started_at:
            raise ValueError('An acquisition needs an ordered start and finish.')
        if self.first_fix_received_at and not self.started_at<=self.first_fix_received_at<=self.finished_at:
            raise ValueError('First delivery must fall inside the request interval.')
        if self.outcome=='success' and not self.first_fix_received_at:
            raise ValueError('Successful acquisition requires a recorded first delivery.')
        if self.outcome=='unsupported' and self.first_fix_received_at:
            raise ValueError('An unsupported acquisition cannot deliver a fix.')
        return self
