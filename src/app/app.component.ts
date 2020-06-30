import {Component} from '@angular/core';
import * as VoxeetSDK from '@voxeet/voxeet-web-sdk';
import {ToastrService} from 'ngx-toastr';

const CONSUMER_KEY = '';
const CONSUMER_SECRET = '=';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  audio = true;
  callJoined = null;
  videoEnabled = false;
  screenShared = false;
  recordingStarted = false;
  listener = false;
  public conferenceName = 'dev-portal';
  public name = undefined;
  public message = '';
  public inProgress = false;
  participantsList = [];
  conference: any;
  conferenceStarted = false;

  constructor(
    private toastr: ToastrService,
  ) {
    VoxeetSDK.conference.on('streamAdded', (participant, stream) => {
      console.log('Stream Added with participant id: ' + participant.id + ' with stream type: ' + this.fetchStreamStype(stream));
      if (stream.getVideoTracks().length) {
        this.addVideoNode(participant, stream);
      }
      if (stream.type === 'ScreenShare') {
        this.addScreenShareNode(stream);
      }
    });

    VoxeetSDK.conference.on('streamRemoved', (participant, stream) => {
      console.log('Stream removed with participant id:' + participant.id + ' with stream type: ' + this.fetchStreamStype(stream));
      if (stream.getVideoTracks().length) {
        this.removeVideoNode(participant);
      }
      if (stream.getAudioTracks().length) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
          track = null;
        });
        this.removeParticipantNode(participant);
      }
      if (stream.type === 'ScreenShare') {
        this.removeScreenShareNode();
      }
    });

    VoxeetSDK.conference.on('streamUpdated', (participant, stream) => {
      console.log('streamUpdated with participant id: ' + participant.id + ' with stream type: ' + this.fetchStreamStype(stream));
      this.showAllVideoParticipants();
      if (!participant.streams[0].getVideoTracks().length) {
        this.removeVideoNode(participant);
      }
    });

    VoxeetSDK.conference.on('participantAdded', (participant, stream) => {
      console.log('participantAdded with participant id' + participant.id + ' with stream type: ' + this.fetchStreamStype(stream));
      this.addParticipantNode(participant);
      this.conferenceStarted = VoxeetSDK.conference.participants.length > 0;
    });

    VoxeetSDK.conference.on('participantUpdated', (participant, stream) => {
      console.log('participantUpdated with participant id' + participant.id + ' with stream type: ' + this.fetchStreamStype(stream));
      if (participant.status === 'Left') {
        this.removeParticipantNode(participant);
      }
    });

    VoxeetSDK.notification.on('conferenceEnded', (participant, stream) => {
      console.log('Conference has ended' + participant.info.name);
      this.removeAllParticipantNodes();
      this.reset();
    });

    VoxeetSDK.command.on('received', (participant, message) => {
      alert('New message by ' + participant.info.name + ': ' + message);
    });
  }

  createSessionForUser() {
    VoxeetSDK.initialize(CONSUMER_KEY, CONSUMER_SECRET);
    return VoxeetSDK.session.open({name: this.name});
  }

  createConference(conferenceID?: string) {
    VoxeetSDK.conference.create({alias: conferenceID || this.conferenceName})
      .then((conference) => {
        this.conference = conference;
        console.log('conference created with id: ' + conference.id);
      }).catch((e) => {
      this.setInProgress(false);
      console.log('Error while creating conference ' + e);
    });
  }

  removeAllParticipantNodes() {
    this.participantsList = VoxeetSDK.conference.participants;
    this.participantsList.forEach((value, key) => {
      this.removeParticipantNode(value);
    });
  }

  fetchStreamStype(stream) {
    if (stream) {
      return stream.type ? stream.type : 'Audio';
    }
    return 'No stream available';
  }

  joinCall() {
    if (this.validateUserAndConferenceName()) {
      this.setInProgress(true);
      this.createSessionForUser()
        .then(() => {
          VoxeetSDK.conference.create({alias: this.conferenceName}, { conferenceOptions: {params: {liveRecording: true}}})
            .then((conference) => {
              VoxeetSDK.conference.join(conference, {constraints: {audio: true, video: false, simulcast: true}})
                .then(() => {
                  this.setInProgress(false);
                  this.callJoined = true;
                })
                .catch((e) => {
                  this.setInProgress(false);
                  console.log('Error while creating conference ' + e);
                });
            });
        });
    }
  }

  validateUserAndConferenceName(): boolean {
    if (!this.name) {
      this.toastr.warning('Please provide username');
      return false;
    }
    if (!this.conferenceName) {
      this.toastr.warning('Please provide conference name');
      return false;
    }
    return true;
  }

  reset() {
    this.leaveCall();
  }

  leaveCall() {
    this.setDefaultValue();
    if (VoxeetSDK.conference.participants.size) {
      this.setInProgress(true);
      this.stopAudioStream();
      this.toastr.success('You left the conference');
      VoxeetSDK.conference.leave()
        .then(() => {
          this.removeAllParticipantNodes();
          VoxeetSDK.session.close()
            .then(() => {
              this.callJoined = false;
              this.listener = false;
              this.setInProgress(false);
            });
        })
        .catch((e) => {
          console.log('Issue while leaving call:' + e);
          this.setInProgress(false);
        });
    }
  }

  stopAudioStream() {
    navigator.mediaDevices
      .getUserMedia({
        audio: true
      }).then((stream) => {
      if (!stream) {
        return;
      }

      stream.getAudioTracks().forEach((track) => {
        track.stop();
      });

      stream = null;
    });
  }


  startVideo() {
    this.setInProgress(true);
    VoxeetSDK.conference.startVideo(VoxeetSDK.session.participant)
      .then(() => {
        console.log('Video started successfully for participant: ' + VoxeetSDK.session.participant.info.name);
        navigator.mediaDevices
          .getUserMedia({
            audio: true,
            video: true
          }).then(stream => {
          this.setInProgress(false);
          this.videoEnabled = true;
          this.addVideoNode(VoxeetSDK.session.participant, stream);
        });

      }).catch((e) => {
      console.log('Issue while starting video :' + e);
      this.setInProgress(false);
    });
  }

  leaveVideo() {
    this.setInProgress(true);
    VoxeetSDK.conference.stopVideo(VoxeetSDK.session.participant)
      .then(() => {
        this.removeVideoNode(VoxeetSDK.session.participant);
        this.setInProgress(false);
        this.videoEnabled = false;
        console.log('Video left successfully: ' + VoxeetSDK.session.participant.info.name);
      }).catch((e) => {
      this.setInProgress(false);
      console.log('Error while leaving video: ' + e);
    });
    console.log('Voxeet session object' + VoxeetSDK.session);
  }

  addVideoNode(participant, stream) {

    const videoContainer = document.getElementById('video-container');

    if (videoContainer) {
      let videoNode = document.getElementById('video-' + participant.id) as HTMLVideoElement;

      if (!videoNode) {
        videoNode = document.createElement('video') as HTMLVideoElement;

        videoNode.setAttribute('id', 'video-' + participant.id);
        videoNode.setAttribute('height', String(220));
        videoNode.setAttribute('width', String(300));
        videoNode.setAttribute('class', String('mt-2'));

        videoContainer.appendChild(videoNode);

        videoNode.autoplay = true;
        videoNode.muted = true;
      }

      videoNode.srcObject = stream;
    }
  }


  addParticipantNode(participant) {
    const participantsList = document.getElementById('participants-list');

    if (participantsList) {

      // if the participant is the current session user, don't add himself to the list
      if (participant.id === VoxeetSDK.session.participant.id) {
        return;
      }

      let participantNode = document.getElementById('participant-' + participant.id);

      // If Participant Node does not exists
      if (!participantNode) {
        participantNode = document.createElement('li');
        participantNode.setAttribute('id', 'participant-' + participant.id);
        participantNode.innerText = `${participant.info.name}`;
        this.toastr.success(`${participant.info.name}` + ' has joined the conference');

        participantsList.appendChild(participantNode);
      }
    }
  }

  addScreenShareNode(stream) {
    const screenShareContainer = document.getElementById('screenshare-container');
    let screenShareNode = document.getElementById('screenshare') as HTMLVideoElement;

    if (screenShareNode) {
      return alert('There is already a participant sharing his screen !');
    }

    screenShareNode = document.createElement('video') as HTMLVideoElement;
    screenShareNode.autoplay = true;

    screenShareContainer.appendChild(screenShareNode);

    screenShareNode.srcObject = stream;
    this.screenShared = true;

  }

  removeScreenShareNode() {
    const screenShareNode = document.getElementById('screenshare');

    if (screenShareNode) {
      this.screenShared = false;
      screenShareNode.parentNode.removeChild(screenShareNode);
    }
  }

  removeParticipantNode(participant) {
    const participantNode = document.getElementById('participant-' + participant.id);

    if (participantNode) {
      this.toastr.info(`${participant.info.name}` + ' has left the conference');
      participantNode.parentNode.removeChild(participantNode);
    }
  }

  removeVideoNode(participant) {
    const videoNode = document.getElementById('video-' + participant.id) as HTMLVideoElement;
    const videoNodeUndefined = document.getElementById('video-undefined') as HTMLVideoElement;

    if (videoNode) {
      this.closeCamera(videoNode);
      videoNode.parentNode.removeChild(videoNode);
    }
    if (videoNodeUndefined) {
      this.closeCamera(videoNodeUndefined);
      videoNode.parentNode.removeChild(videoNodeUndefined);
    }
  }

  closeCamera(videoNode) {
    const stream = videoNode.srcObject;
    stream.getVideoTracks().forEach((track) => {
      track.stop();
    });
    videoNode.srcObject = null;
  }

  muteYourself() {
    this.setInProgress(true);
    if (!this.audio) {
      VoxeetSDK.conference.startAudio(VoxeetSDK.session.participant)
        .then(() => {
          console.log('audio stream started');
          this.setInProgress(false);
        }).catch((e) => {
        this.setInProgress(false);
        console.log('Error while starting audio' + e);
      });
    } else {
      VoxeetSDK.conference.stopAudio(VoxeetSDK.session.participant)
        .then(() => {
          console.log('audio stream stopped');
          this.setInProgress(false);
        }).catch((e) => {
        this.setInProgress(false);
        console.log('Error while stopping audio' + e);
      });
    }

    this.audio = !this.audio;
  }


  startScreenShare() {
    this.setInProgress(true);
    VoxeetSDK.conference.startScreenShare()
      .then(() => {
        console.log('screen shared started successfully');
        this.setInProgress(false);
      })
      .catch(e => {
        console.log('screen sharing start bug ' + e);
        this.setInProgress(false);
      });
  }

  stopScreenShare() {
    this.setInProgress(true);
    VoxeetSDK.conference.stopScreenShare()
      .then(() => {
        console.log('screen shared stop successfully');
        this.setInProgress(false);
      })
      .catch(e => {
        console.log('screen sharing stop bug ' + e);
        this.setInProgress(false);
      });
  }

  broadCastMessage() {
    if (!this.message || this.message === '') {
      alert('Please write some message then send');
      return;
    }
    this.setInProgress(true);
    VoxeetSDK.command.send(this.message)
      .then(() => {
        this.toastr.success('Message sent successfully');
        console.log('send messsage successfully');
        this.setInProgress(false);
      })
      .catch(e => {
        this.toastr.error('Faied to send message');
        console.log('send message failed' + e);
        this.setInProgress(false);
      });
  }

  startRecording() {
    this.setInProgress(true);
    VoxeetSDK.recording.start()
      .then(() => {
        this.recordingStarted = true;
        console.log('started recording successfully');
        this.setInProgress(false);

      })
      .catch(e => {
        console.log('recording start failed' + e);
        this.setInProgress(false);
      });
  }


  stopRecording() {
    this.setInProgress(true);
    VoxeetSDK.recording.stop()
      .then(() => {
        this.recordingStarted = false;
        console.log('Stopped recording successfully');
        this.setInProgress(false);

      })
      .catch(e => {
        console.log('recording stop failed' + e);
        this.setInProgress(false);
      });
  }

  listenConference() {
    if (VoxeetSDK.conference.participants.length) {
      VoxeetSDK.session.close();
    }
    if (this.validateUserAndConferenceName()) {
      this.setInProgress(true);
      this.createSessionForUser()
        .then(() => {
          VoxeetSDK.conference.create({alias: this.conferenceName})
            .then((conference) => {
              VoxeetSDK.conference.listen(conference)
                .then(() => {
                  console.log('Listening conference');
                  this.callJoined = true;
                  this.listener = true;
                  this.setInProgress(false);
                })
                .catch(e => {
                  console.log('Listening conference failed' + e);
                  this.setInProgress(false);
                });
            });
        });
    }
  }


  inviteParticipantToBecomeBroadCaster() {
    this.setInProgress(true);
    this.createSessionForUser()
      .then(() => {
        VoxeetSDK.conference.invite({alias: this.conferenceName || 'dev-portal'})
          .then((conference) => {
            console.log(VoxeetSDK.conference.participants);
            this.setInProgress(false);
            console.log(conference);
          }).catch((e) => {
          console.log('Error while sending invite' + e);
          this.setInProgress(false);
        });
      });
  }

  setInProgress(value: boolean) {
    this.inProgress = value;
  }

  setDefaultValue() {
    this.videoEnabled = false;
    this.audio = true;
    this.callJoined = false;
    this.screenShared = false;
    this.recordingStarted = false;
    this.setInProgress(false);
  }

  private showAllVideoParticipants() {
    this.participantsList = VoxeetSDK.conference.participants;
    this.participantsList.forEach((value, key) => {
      if (value.id !== VoxeetSDK.session.participant.id
      ) {

        if (value.streams[0] && value.streams[0].getVideoTracks().length) {
          this.addVideoNode(value, value.streams[0]);
          return;
        }

      }
    });
  }

}
